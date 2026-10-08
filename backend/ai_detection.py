from ultralytics import YOLO
import math
import cv2
import os
import subprocess

model = YOLO("yolo11n.pt")


def analyze_video(video_path):

    # -------------------------------------------------
    # YOLO + BYTE TRACK
    # Process every 2nd frame for better speed
    # -------------------------------------------------

    results = model.track(
        source=video_path,
        stream=True,
        persist=True,
        tracker="bytetrack.yaml",
        conf=0.4,
        vid_stride=2
    )

    previous_distance = None
    latest_data = None

    timeline_events = []
    timeline_event_keys = set()

    # -------------------------------------------------
    # OUTPUT VIDEO
    # -------------------------------------------------

    output_dir = "annotated_videos"
    os.makedirs(output_dir, exist_ok=True)

    video_name = os.path.splitext(
        os.path.basename(video_path)
    )[0]

    output_path = os.path.join(
        output_dir,
        f"{video_name}_detected.mp4"
    )

    # -------------------------------------------------
    # GET ORIGINAL VIDEO FPS
    # -------------------------------------------------

    cap = cv2.VideoCapture(video_path)

    fps = cap.get(cv2.CAP_PROP_FPS)

    if not fps or fps <= 0:
        fps = 30

    cap.release()

    # Because vid_stride=2 processes half the frames,
    # use half FPS so output duration stays approximately correct.
    output_fps = max(fps / 2, 1)

    video_writer = None

    latest_detections = []

    # -------------------------------------------------
    # PROCESS DETECTED FRAMES
    # -------------------------------------------------

    for frame_no, result in enumerate(results):

        annotated_frame = result.orig_img.copy()

        # -------------------------------------------------
        # CREATE VIDEO WRITER
        # -------------------------------------------------

        if video_writer is None:

            height, width = annotated_frame.shape[:2]

            fourcc = cv2.VideoWriter_fourcc(*"mp4v")

            video_writer = cv2.VideoWriter(
                output_path,
                fourcc,
                output_fps,
                (width, height)
            )

            if not video_writer.isOpened():

                raise RuntimeError(
                    "VideoWriter could not open. "
                    "Unable to create annotated video."
                )

        # -------------------------------------------------
        # DETECTIONS
        # -------------------------------------------------

        vehicles = []

        for box in result.boxes:

            if box.id is None:
                continue

            track_id = int(box.id.item())

            x1, y1, x2, y2 = box.xyxy[0].tolist()

            center_x = (x1 + x2) / 2
            center_y = (y1 + y2) / 2

            class_id = int(box.cls[0].item())

            if isinstance(result.names, dict):

                object_name = result.names.get(
                    class_id,
                    "object"
                )

            else:

                object_name = result.names[class_id]

            vehicles.append(
                {
                    "id": track_id,
                    "x": center_x,
                    "y": center_y,
                    "name": object_name,
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2
                }
            )

        vehicle_count = len(vehicles)

        latest_detections = vehicles

        video_seconds = frame_no / output_fps

        # -------------------------------------------------
        # DEFAULT RISK
        # -------------------------------------------------

        risk_score = 0
        risk_level = "LOW"
        near_miss = False
        alert = "NORMAL"

        current_distance = None
        distance_change = 0

        closest = None

        # -------------------------------------------------
        # CALCULATE DISTANCES
        # -------------------------------------------------

        distances = []

        for i in range(len(vehicles)):

            for j in range(i + 1, len(vehicles)):

                v1 = vehicles[i]
                v2 = vehicles[j]

                distance = math.sqrt(
                    (v1["x"] - v2["x"]) ** 2
                    +
                    (v1["y"] - v2["y"]) ** 2
                )

                distances.append(
                    (
                        v1["id"],
                        v2["id"],
                        distance,
                        v1["name"],
                        v2["name"]
                    )
                )

        # -------------------------------------------------
        # FIND CLOSEST OBJECTS
        # -------------------------------------------------

        if distances:

            closest = min(
                distances,
                key=lambda x: x[2]
            )

            current_distance = closest[2]

            if previous_distance is not None:

                distance_change = (
                    current_distance
                    - previous_distance
                )

            # -------------------------------------------------
            # RISK SCORE
            # -------------------------------------------------

            if current_distance < 30:

                risk_score = 90

            elif current_distance < 45:

                risk_score = 75

            elif current_distance < 60:

                risk_score = 50

            else:

                risk_score = 25

            # Objects getting closer
            if distance_change < 0:

                risk_score += 10

            risk_score = min(
                risk_score,
                100
            )

            # -------------------------------------------------
            # RISK LEVEL
            # -------------------------------------------------

            if risk_score >= 80:

                risk_level = "CRITICAL"

            elif risk_score >= 60:

                risk_level = "HIGH"

            elif risk_score >= 40:

                risk_level = "MEDIUM"

            else:

                risk_level = "LOW"

            near_miss = risk_score >= 80

            # -------------------------------------------------
            # ALERT
            # -------------------------------------------------

            if near_miss:

                alert = "NEAR-MISS DETECTED"

            elif risk_score >= 60:

                alert = "HIGH-RISK INTERACTION"

            else:

                alert = "NORMAL"

            # -------------------------------------------------
            # TIMELINE
            # -------------------------------------------------

            current_risk_event = None

            if risk_score >= 80:

                current_risk_event = "near_miss"

            elif risk_score >= 60:

                current_risk_event = "high_risk"

            if current_risk_event:

                object_pair = (
                    f"{closest[3]} + {closest[4]}"
                )

                event_key = (
                    current_risk_event,
                    object_pair
                )

                if (
                    event_key not in timeline_event_keys
                    and len(timeline_events) < 6
                ):

                    if current_risk_event == "near_miss":

                        message = "Near-miss detected"

                    else:

                        message = "High-risk interaction"

                    timeline_events.append(
                        {
                            "type": current_risk_event,
                            "time": round(
                                video_seconds,
                                2
                            ),
                            "message": message,
                            "details": (
                                f"{object_pair} - "
                                f"Risk {risk_score}%"
                            ),
                            "risk": risk_score
                        }
                    )

                    timeline_event_keys.add(
                        event_key
                    )

            previous_distance = current_distance

        # -------------------------------------------------
        # DRAW MOVING BOUNDING BOXES
        # -------------------------------------------------

        for vehicle in vehicles:

            x1 = int(vehicle["x1"])
            y1 = int(vehicle["y1"])
            x2 = int(vehicle["x2"])
            y2 = int(vehicle["y2"])

            object_name = vehicle["name"]
            track_id = vehicle["id"]

            # Risk-based box color
            if risk_level == "CRITICAL":

                box_color = (0, 0, 255)

            elif risk_level == "HIGH":

                box_color = (0, 165, 255)

            elif risk_level == "MEDIUM":

                box_color = (0, 255, 255)

            else:

                box_color = (0, 200, 0)

            # Bounding box
            cv2.rectangle(
                annotated_frame,
                (x1, y1),
                (x2, y2),
                box_color,
                2
            )

            # Label
            label = (
                f"{object_name} "
                f"ID:{track_id} "
                f"{risk_level}"
            )

            label_width = max(
                190,
                len(label) * 9
            )

            label_top = max(
                0,
                y1 - 28
            )

            cv2.rectangle(
                annotated_frame,
                (x1, label_top),
                (x1 + label_width, y1),
                box_color,
                -1
            )

            cv2.putText(
                annotated_frame,
                label,
                (x1 + 5, max(18, y1 - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (255, 255, 255),
                2
            )

        # -------------------------------------------------
        # FINAL AI DATA
        # -------------------------------------------------

        if closest:

            latest_data = {

                "frame": frame_no + 1,

                "video_time": round(
                    video_seconds,
                    2
                ),

                "vehicle_count": vehicle_count,

                "vehicle_1": closest[0],

                "vehicle_2": closest[1],

                "vehicle_1_type": closest[3],

                "vehicle_2_type": closest[4],

                "distance": round(
                    current_distance,
                    2
                ),

                "distance_change": round(
                    distance_change,
                    2
                ),

                "risk_score": risk_score,

                "risk_level": risk_level,

                "near_miss": near_miss,

                "alert": alert,

                "detections": latest_detections,

                "timeline": timeline_events
            }

        elif vehicle_count > 0:

            latest_data = {

                "frame": frame_no + 1,

                "video_time": round(
                    video_seconds,
                    2
                ),

                "vehicle_count": vehicle_count,

                "risk_score": 0,

                "risk_level": "LOW",

                "near_miss": False,

                "alert": "NORMAL",

                "detections": latest_detections,

                "timeline": timeline_events
            }

                        # -------------------------------------------------
        # SAVE ANNOTATED FRAME
        # -------------------------------------------------

        if video_writer is not None:
            video_writer.write(annotated_frame)

    # -------------------------------------------------
    # RELEASE VIDEO
    # -------------------------------------------------

    if video_writer is not None:
        video_writer.release()

    # -------------------------------------------------
    # CONVERT TO BROWSER-COMPATIBLE H.264 MP4
    # -------------------------------------------------

    h264_output_path = os.path.join(
        output_dir,
        f"{video_name}_detected_h264.mp4"
    )

    ffmpeg_path = (
        r"C:\Users\BHARGAV\AppData\Local\Microsoft\WinGet\Packages"
        r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
        r"\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
    )

    try:
        subprocess.run(
            [
                ffmpeg_path,
                "-y",
                "-i",
                output_path,
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
                h264_output_path
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

        output_path = h264_output_path

    except Exception as e:
        print("FFmpeg conversion failed:", e)

    # -------------------------------------------------
    # FINAL OUTPUT
    # -------------------------------------------------

    if latest_data is not None:
        latest_data["annotated_video"] = output_path

    return latest_data