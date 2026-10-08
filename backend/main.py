from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import os
from fastapi.staticfiles import StaticFiles
from ai_detection import analyze_video
from fastapi import FastAPI, Query, UploadFile, File
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
VIDEO_DIR = os.path.join(PROJECT_DIR, "frontend", "src", "assets")

VIDEO_PATHS = {
    "Junction 1": {
        "Camera 1": os.path.join(VIDEO_DIR, "traffic-junction-a.mp4"),
    },

    "Junction 2": {
        "Camera 1": os.path.join(VIDEO_DIR, "traffic-junction-b.mp4"),
    },

    "Main Road": {
        "Camera 1": os.path.join(VIDEO_DIR, "traffic-main-road.mp4"),
    },
}
IMAGE_DATASET_PATH = os.path.join(BASE_DIR, "alert_images")
app = FastAPI()
ANNOTATED_VIDEO_DIR = os.path.join(os.path.dirname(__file__), "annotated_videos")
os.makedirs(ANNOTATED_VIDEO_DIR, exist_ok=True)

app.mount("/annotated-videos", StaticFiles(directory=ANNOTATED_VIDEO_DIR), name="annotated-videos")

app.mount(
    "/alert-images",
    StaticFiles(directory=IMAGE_DATASET_PATH),
    name="alert-images"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "NearMiss AI Backend is Running"
    }


@app.get("/api/status")
def status():
    return {
        "status": "connected",
        "message": "NearMiss AI backend is connected"
    }


@app.get("/api/analyze")
def analyze(junction: str = Query(...), camera: str = Query(...)):

    actual_video_path = VIDEO_PATHS.get(junction, {}).get(camera)

    if actual_video_path is None:
        return {
            "status": "error",
            "message": "Camera video not found"
        }

    result = analyze_video(actual_video_path)

    if result and result.get("annotated_video"):
     result["annotated_video"] = "/annotated-videos/" + os.path.basename(result["annotated_video"])

    alert_image = None

    if result and result.get("near_miss"):
        images = [
            file
            for file in os.listdir(IMAGE_DATASET_PATH)
            if file.lower().endswith((".jpg", ".jpeg", ".png"))
        ]

        if images:
            alert_image = images[0]

    return {
        "status": "success",
        "message": "AI video analysis completed",
        "junction": junction,
        "camera": camera,
        "result": result,
        "alert_image": alert_image
    }
@app.post("/api/analyze-upload")
async def analyze_uploaded_video(file: UploadFile = File(...)):

    upload_dir = os.path.join(
        os.path.dirname(__file__),
        "uploads"
    )

    os.makedirs(upload_dir, exist_ok=True)

    video_path = os.path.join(
        upload_dir,
        file.filename
    )

    with open(video_path, "wb") as buffer:
        buffer.write(await file.read())

    result = analyze_video(video_path)

    if result and result.get("annotated_video"):
     result["annotated_video"] = "/annotated-videos/" + os.path.basename(result["annotated_video"])

    return {
        "status": "success",
        "message": "Uploaded video analysis completed",
        "filename": file.filename,
        "result": result
    }
@app.get("/api/alerts")
def get_alerts():

    return {
        "status": "success",
        "alerts": [
            {
                "id": 1,
                "junction": "Junction 1",
                "camera": "Camera 1",
                "risk_level": "CRITICAL",
                "risk_score": 90,
                "alert": "NEAR-MISS DETECTED",
                "image": "/alert-images/acc1%20%287%29.jpg"
            },
            {
                "id": 2,
                "junction": "Junction 1",
                "camera": "Camera 2",
                "risk_level": "HIGH",
                "risk_score": 85,
                "alert": "NEAR-MISS DETECTED",
                "image": "/alert-images/test10_33.jpg"
            },
            {
                "id": 3,
                "junction": "Junction 2",
                "camera": "Camera 1",
                "risk_level": "CRITICAL",
                "risk_score": 88,
                "alert": "NEAR-MISS DETECTED",
                "image": "/alert-images/test10_34.jpg"
            },
            {
                "id": 4,
                "junction": "Main Road",
                "camera": "Camera 1",
                "risk_level": "MEDIUM",
                "risk_score": 65,
                "alert": "NEAR-MISS DETECTED",
                "image": "/alert-images/test10_35.jpg"
            }
        ]
    }
@app.get("/api/events")
def get_events():

    return {
        "status": "success",
        "events": [
            {
                "id": "NM-014",
                "time": "18:42:31",
                "location": "Junction 1",
                "objects": "Car + Motorcycle",
                "risk": "CRITICAL",
                "score": 87
            },
            {
                "id": "NM-013",
                "time": "18:37:05",
                "location": "Junction 1",
                "objects": "Car + Pedestrian",
                "risk": "CRITICAL",
                "score": 92
            },
            {
                "id": "NM-012",
                "time": "18:21:48",
                "location": "Main Road",
                "objects": "Motorcycle + Motorcycle",
                "risk": "MEDIUM",
                "score": 54
            },
            {
                "id": "NM-011",
                "time": "18:12:10",
                "location": "Junction 1",
                "objects": "Car + Car",
                "risk": "HIGH",
                "score": 78
            },
            {
                "id": "NM-010",
                "time": "18:02:44",
                "location": "Junction 1",
                "objects": "Bus + Pedestrian",
                "risk": "HIGH",
                "score": 66
            }
        ]
    }