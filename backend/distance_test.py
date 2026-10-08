from ultralytics import YOLO
import math

model = YOLO("yolo11n.pt")

video_path = r"C:\Users\BHARGAV\Downloads\AICity21-Track4-Anomaly-Detection\AIC21-Track4-Anomaly-Detection\aic21-track4-train-data\1.mp4"

results = model.track(
    source=video_path,
    stream=True,
    persist=True,
    tracker="bytetrack.yaml",
    conf=0.4
)

previous_distance = None

for frame_no, result in zip(range(10), results):

    vehicles = []

    for box in result.boxes:
        if box.id is not None:

            track_id = int(box.id)

            x1, y1, x2, y2 = box.xyxy[0]

            center_x = float((x1 + x2) / 2)
            center_y = float((y1 + y2) / 2)

            vehicles.append(
                (track_id, center_x, center_y)
            )

    distances = []

    for i in range(len(vehicles)):
        for j in range(i + 1, len(vehicles)):

            id1, x1, y1 = vehicles[i]
            id2, x2, y2 = vehicles[j]

            distance = math.sqrt(
                (x1 - x2) ** 2 +
                (y1 - y2) ** 2
            )

            distances.append(
                (id1, id2, distance)
            )

    if distances:

        closest = min(distances, key=lambda x: x[2])

        current_distance = closest[2]

        if previous_distance is None:
            change = 0
        else:
            change = current_distance - previous_distance

        # Risk score
        if current_distance < 30:
            risk_score = 90
        elif current_distance < 45:
            risk_score = 75
        elif current_distance < 60:
            risk_score = 50
        else:
            risk_score = 25

        # Increase risk if vehicles are approaching
        if change < 0:
            risk_score += 10

        # Keep score between 0 and 100
        risk_score = min(risk_score, 100)

        # Risk level
        if risk_score >= 80:
            risk_level = "CRITICAL"
        elif risk_score >= 60:
            risk_level = "HIGH"
        elif risk_score >= 40:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        print(
            f"Frame {frame_no + 1}: "
            f"Vehicles {closest[0]} + {closest[1]} | "
            f"Distance = {current_distance:.2f} px | "
            f"Change = {change:.2f} | "
            f"Risk Score = {risk_score} | "
            f"Risk = {risk_level}"
        )

        previous_distance = current_distance

    else:
        print(
            f"Frame {frame_no + 1}: "
            f"Not enough vehicles"
        )
