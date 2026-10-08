from ultralytics import YOLO
import math
import cv2

model = YOLO("yolo11n.pt")


def analyze_video(video_path):

    results = model.track(
        source=video_path,
        stream=True,
        persist=True,
        tracker="bytetrack.yaml",
        conf=0.4
    )

    previous_distance = None
    latest_data = None

    timeline_events = []
    timeline_event_keys = set()

    previous_vehicle_count = 0
        # -----------------------------------------
    # ANNOTATED VIDEO OUTPUT
    # -----------------------------------------

    import os

    output_dir = "annotated_videos"
    os.makedirs(output_dir, exist_ok=True)

    video_name = os.path.splitext(
        os.path.basename(video_path)
    )[0]

    output_path = os.path.join(
        output_dir,
        f"{video_name}_detected.mp4"
    )

    video_writer = None

    cap = cv2.VideoCapture(video_path)

    fps = cap.get(cv2.CAP_PROP_FPS)

    if not fps or fps <= 0:
        fps = 30

    cap.release()

        # Latest actual YOLO detections
    latest_detections = []

    for frame_no, result in enumerate(results):

        annotated_frame = result.orig_img.copy()

        if video_writer is None:
            height, width = annotated_frame.shape[:2]

            fourcc = cv2.VideoWriter_fourcc(*"mp4v")

            video_writer = cv2.VideoWriter(
                output_path,
                fourcc,
                fps,
                (width, height)
            )

        vehicles = []

        # -------------------------------------------------
        # YOLO DETECTIONS
        # -------------------------------------------------

        for box in result.boxes:

            if box.id is None:
                continue

            track_id = int(box.id)

            x1, y1, x2, y2 = box.xyxy[0]

            x1 = float(x1)
            y1 = float(y1)
            x2 = float(x2)
            y2 = float(y2)

            center_x = (x1 + x2) / 2
            center_y = (y1 + y2) / 2

            class_id = int(box.cls[0])

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

                            # -----------------------------------------
        # DRAW MOVING YOLO BOXES
        # -----------------------------------------

        

        vehicle_count = len(vehicles)

        latest_detections = vehicles

        video_seconds = frame_no / fps

        # -------------------------------------------------
        # TRACKING STARTED
        # -------------------------------------------------

        if (
            vehicle_count > 0
            and previous_vehicle_count == 0
        ):

            timeline_events.append(
                {
                    "type": "tracking",
                    "time": round(video_seconds, 2),
                    "message": "Vehicle tracking started",
                    "details": (
                        f"{vehicle_count} vehicles detected"
                    ),
                    "risk": None
                }
            )

        # -------------------------------------------------
        # DISTANCE CALCULATION
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
        # PROCESS CLOSEST OBJECTS
        # -------------------------------------------------

        if distances:

            closest = min(
                distances,
                key=lambda x: x[2]
            )

            current_distance = closest[2]

            # Distance change
            if previous_distance is None:
                change = 0
            else:
                change = (
                    current_distance
                    -
                    previous_distance
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
            if change < 0:
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

                        # DRAW MOVING YOLO BOXES

            for vehicle in vehicles:

                x1 = int(vehicle["x1"])
                y1 = int(vehicle["y1"])
                x2 = int(vehicle["x2"])
                y2 = int(vehicle["y2"])

                object_name = vehicle["name"]
                track_id = vehicle["id"]

                if risk_level == "CRITICAL":
                    box_color = (0, 0, 255)
                elif risk_level == "HIGH":
                    box_color = (0, 165, 255)
                elif risk_level == "MEDIUM":
                    box_color = (0, 255, 255)
                else:
                    box_color = (0, 200, 0)

                cv2.rectangle(
                    annotated_frame,
                    (x1, y1),
                    (x2, y2),
                    box_color,
                    2
                )

                label = f"{object_name} ID:{track_id} {risk_level}"

                cv2.rectangle(
                    annotated_frame,
                    (x1, max(0, y1 - 28)),
                    (x1 + 190, y1),
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
            # DRAW DYNAMIC YOLO BOXES
            # -------------------------------------------------

            for vehicle in vehicles:

                x1 = int(vehicle["x1"])
                y1 = int(vehicle["y1"])
                x2 = int(vehicle["x2"])
                y2 = int(vehicle["y2"])

                object_name = vehicle["name"]
                track_id = vehicle["id"]

                if risk_level == "CRITICAL":
                    box_color = (0, 0, 255)
                elif risk_level == "HIGH":
                    box_color = (0, 165, 255)
                elif risk_level == "MEDIUM":
                    box_color = (0, 255, 255)
                else:
                    box_color = (0, 200, 0)

                cv2.rectangle(
                    annotated_frame,
                    (x1, y1),
                    (x2, y2),
                    box_color,
                    2
                )

                label = f"{object_name} ID:{track_id} {risk_level}"

                cv2.rectangle(
                    annotated_frame,
                    (x1, max(0, y1 - 28)),
                    (x1 + 190, y1),
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
            # ALERT
            # -------------------------------------------------

            if near_miss:
                alert = "NEAR-MISS DETECTED"

            elif risk_score >= 60:
                alert = "HIGH-RISK INTERACTION"

            else:
                alert = "NORMAL"

            # -------------------------------------------------
            # TIMELINE EVENT
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
                                f"{object_pair} — "
                                f"Risk {risk_score}%"
                            ),
                            "risk": risk_score
                        }
                    )

                    timeline_event_keys.add(
                        event_key
                    )

            # -------------------------------------------------
            # FINAL AI RESULT
            # -------------------------------------------------

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
                    change,
                    2
                ),

                "risk_score": risk_score,

                "risk_level": risk_level,

                "near_miss": near_miss,

                "alert": alert,

                # ACTUAL YOLO DETECTIONS
                "detections": latest_detections,

                # MAX 6 IMPORTANT EVENTS
                "timeline": timeline_events
            }

            print(
                "AI FRAME:",
                frame_no + 1,
                "OBJECTS:",
                latest_detections
            )

            previous_distance = current_distance

        # Save annotated frame
        if video_writer is not None:
            video_writer.write(annotated_frame)

        previous_vehicle_count = vehicle_count

    if video_writer is not None:
        video_writer.release()

    if latest_data is not None:
        latest_data["annotated_video"] = output_path

    return latest_data