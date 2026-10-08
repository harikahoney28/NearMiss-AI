import { useEffect, useRef, useState } from "react";
import "./App.css";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import trafficScene from "./assets/traffic.png";
import trafficJunctionA from "./assets/traffic-junction-a.mp4";
import trafficJunctionB from "./assets/traffic-junction-b.mp4";
import trafficMainRoad from "./assets/traffic-main-road.mp4";
import nearMiss1 from "./assets/nearmiss_split_images/near-miss-1.png";
import nearMiss2 from "./assets/nearmiss_split_images/near-miss-2.png";
import nearMiss3 from "./assets/nearmiss_split_images/near-miss-3.png";
import nearMiss4 from "./assets/nearmiss_split_images/near-miss-4.png";
import nearMiss5 from "./assets/nearmiss_split_images/near-miss-5.png";
type RiskLevel = "Critical" | "High" | "Medium" | "Low" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

type EventItem = {
  id: string;
  time: string;
  location: string;
  objects: string;
  risk: RiskLevel;
  score: number;
};

type AlertItem = {
  id: number;
  level: RiskLevel;
  title: string;
  location: string;
  time: string;
  objects: string;
  score: number;
};

const events: EventItem[] = [
  {
    id: "NM-014",
    time: "18:42:31",
    location: "Junction A",
    objects: "Car + Motorcycle",
    risk: "Critical",
    score: 87,
  },
  {
    id: "NM-013",
    time: "18:37:05",
    location: "Junction A",
    objects: "Car + Pedestrian",
    risk: "Critical",
    score: 92,
  },
  {
    id: "NM-012",
    time: "18:21:48",
    location: "Main Road",
    objects: "Motorcycle + Motorcycle",
    risk: "Medium",
    score: 54,
  },
  {
    id: "NM-011",
    time: "18:12:10",
    location: "Junction A",
    objects: "Car + Car",
    risk: "High",
    score: 78,
  },
  {
    id: "NM-010",
    time: "18:02:44",
    location: "College Gate",
    objects: "Bus + Pedestrian",
    risk: "High",
    score: 66,
  },
];

const alerts: AlertItem[] = [
  {
    id: 1,
    level: "Critical",
    title: "Near-Miss Detected",
    location: "Junction A",
    time: "18:42:31",
    objects: "Car + Motorcycle",
    score: 87,
  },
  {
    id: 2,
    level: "High",
    title: "Near-Miss Detected",
    location: "Junction B",
    time: "18:37:05",
    objects: "Car + Pedestrian",
    score: 92,
  },
  {
    id: 3,
    level: "Medium",
    title: "Near-Miss Detected",
    location: "Main Road",
    time: "18:21:48",
    objects: "Motorcycle + Motorcycle",
    score: 54,
  },
];

const eventTypeData = [
  { label: "Vehicle - Vehicle", value: 8, percent: 57 },
  { label: "Vehicle - Pedestrian", value: 3, percent: 21 },
  { label: "Two-Wheeler", value: 3, percent: 21 },
];

const riskData = [
  { label: "Critical", value: 5, percent: 36, className: "critical" },
  { label: "High", value: 4, percent: 29, className: "high" },
  { label: "Medium", value: 3, percent: 21, className: "medium" },
  { label: "Low", value: 2, percent: 14, className: "low" },
];

const vehicleData = [
  { label: "Cars", value: 182, percent: 38, icon: "🚗" },
  { label: "Motorcycles", value: 143, percent: 30, icon: "🏍️" },
  { label: "Buses", value: 28, percent: 6, icon: "🚌" },
  { label: "Trucks", value: 19, percent: 4, icon: "🚛" },
  { label: "Bicycles", value: 12, percent: 2, icon: "🚲" },
  { label: "Pedestrians", value: 98, percent: 20, icon: "🚶" },
];

const hourlyBars = [
  1, 2, 1, 2, 2, 3, 4, 3, 4, 5, 4, 5,
  6, 6, 7, 8, 10, 9, 8, 6, 4, 3, 2, 1,
];

const menuItems = [
  { name: "Dashboard", icon: "⌂" },
  { name: "Live Detection", icon: "◉", live: true },
  { name: "Analyze Video", icon: "▣" },
  { name: "Events", icon: "⚠" },
  { name: "Risk Map", icon: "⌖" },
  { name: "Reports", icon: "▤" },
  { name: "Analytics", icon: "▥" },
];

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`risk-badge ${level.toLowerCase()}`}>
      {level}
    </span>
  );
}

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [reportLocation, setReportLocation] = useState<
  "Junction A" | "Junction B" | "Main Road"
>("Junction A");
const [reportGenerated, setReportGenerated] = useState(false);
  const [selectedJunction, setSelectedJunction] = useState("Junction A");
  const [selectedCamera, setSelectedCamera] = useState("Camera 1");
  const mapRef = useRef<HTMLDivElement | null>(null);
  const riskMapRef = useRef<HTMLDivElement | null>(null);
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [aiResult, setAiResult] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [eventsData, setEventsData] = useState<any[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
const [uploadedVideoUrl, setUploadedVideoUrl] = useState("");
const [uploadProgress, setUploadProgress] = useState(0);
const [isAnalyzingUpload, setIsAnalyzingUpload] = useState(false);
const [uploadAnalysis, setUploadAnalysis] = useState<any>(null);

const runAIAnalysis = async () => {
  console.log("ANALYZE BUTTON CLICKED");

  try {
    const backendJunction =
      selectedJunction === "Junction A"
        ? "Junction 1"
        : selectedJunction === "Junction B"
        ? "Junction 2"
        : "Main Road";

        console.log("SENDING REQUEST TO BACKEND");

    const response = await fetch(
      `http://127.0.0.1:8000/api/analyze?junction=${encodeURIComponent(
        backendJunction
      )}&camera=${encodeURIComponent(selectedCamera)}`
    );

    console.log("BACKEND RESPONSE RECEIVED");

    const data = await response.json();

    console.log("AI RESULT:", data);

    if (data.status === "success") {
      setAiResult(data.result);
      setAiResult({
  ...data.result,
  annotated_video: `${data.result.annotated_video}?t=${Date.now()}`,
});
    } else {
      console.error("AI ERROR:", data.message);
    }
  } catch (error) {
    console.error("AI analysis failed:", error);
  }
};
const handleVideoUpload = (file: File) => {
  setUploadedVideo(file);
  setUploadedVideoUrl(URL.createObjectURL(file));
  setUploadAnalysis(null);
  setUploadProgress(0);
};

  useEffect(() => {
  fetch("http://127.0.0.1:8000/api/status")
    .then((response) => response.json())
    .then((data) => {
      setBackendStatus(data.message);
    })
    .catch(() => {
      setBackendStatus("Backend connection failed");
    });
}, []);


useEffect(() => {
  fetch("http://127.0.0.1:8000/api/alerts")
    .then((response) => response.json())
    .then((data) => {
      console.log("ALERTS FROM BACKEND:", data.alerts);
      setAlerts(data.alerts);
    })
    .catch((error) => {
      console.error("Failed to load alerts:", error);
    });
}, []);

useEffect(() => {
  if (!mapRef.current) return;

  const map = L.map(mapRef.current).setView([16.73, 82.22], 13);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  return () => {
    map.remove();
  };
}, []);
useEffect(() => {
  if (activePage !== "Risk Map" || !riskMapRef.current) return;

  const map = L.map(riskMapRef.current).setView([16.73, 82.22], 13);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const junctions = [
    {
      name: "Junction 1",
      risk: "Critical",
      score: 87,
      events: 12,
      nearMisses: 8,
      lat: 16.735,
      lng: 82.215,
    },
    {
      name: "Junction A",
      risk: "High",
      score: 78,
      events: 6,
      nearMisses: 4,
      lat: 16.725,
      lng: 82.225,
    },
    {
      name: "Junction B",
      risk: "Low",
      score: 32,
      events: 1,
      nearMisses: 0,
      lat: 16.738,
      lng: 82.235,
    },
    {
      name: "Main Road",
      risk: "Medium",
      score: 61,
      events: 4,
      nearMisses: 2,
      lat: 16.718,
      lng: 82.218,
    },
  ];

  junctions.forEach((junction) => {
    const marker = L.marker([junction.lat, junction.lng]).addTo(map);

    marker.bindTooltip(junction.name, {
      permanent: true,
      direction: "top",
      offset: [0, -10],
    });

    marker.on("click", () => {
      setSelectedJunction(junction.name);
    });
  });

  setTimeout(() => {
    map.invalidateSize();
  }, 100);

  return () => {
    map.remove();
  };
}, [activePage]);

useEffect(() => {
  fetch("http://127.0.0.1:8000/api/events")
    .then((response) => response.json())
    .then((data) => {
      console.log("EVENTS FROM BACKEND:", data.events);
      setEventsData(data.events);
    })
    .catch((error) => {
      console.error("Failed to load events:", error);
    });
}, []);

  const selectedVideo =
  selectedJunction === "Junction A"
    ? trafficJunctionA
    : selectedJunction === "Junction B"
    ? trafficJunctionB
    : trafficMainRoad;

    const reportDetails = {
  "Junction A": {
    total: 45,
    nearMisses: 24,
    critical: 7,
    highRisk: 5,
  },
  "Junction B": {
    total: 32,
    nearMisses: 17,
    critical: 4,
    highRisk: 3,
  },
  "Main Road": {
    total: 58,
    nearMisses: 29,
    critical: 9,
    highRisk: 6,
  },
};

  const renderPlaceholder = () => {
    
      if (activePage === "Live Detection") {
  const liveRisk = aiResult?.risk_score ?? 0;

  const liveAlert = aiResult?.near_miss
    ? "NEAR-MISS ALERT"
    : liveRisk >= 60
    ? "HIGH-RISK INTERACTION"
    : "AI ANALYSIS RUNNING";

  const liveObjectPair =
    aiResult?.vehicle_1_type && aiResult?.vehicle_2_type
      ? `${aiResult.vehicle_1_type} + ${aiResult.vehicle_2_type}`
      : "Waiting for AI detection...";

  const cameraPrefix =
    selectedJunction === "Junction A"
      ? "A"
      : selectedJunction === "Junction B"
      ? "B"
      : "M";

  const cameraNumber =
    selectedCamera === "Camera 1"
      ? "1"
      : selectedCamera === "Camera 2"
      ? "2"
      : "3";

  const displayCamera = `${cameraPrefix}${cameraNumber}`;

  return (
    <div className="live-detection-page">

      {/* HEADER */}
      <div className="page-header live-page-header">
        <div>
          <h2>Live Detection</h2>
          <p>
            Real-time (simulated) traffic video analysis with AI detection
          </p>
        </div>

        <span className="live-pill">LIVE</span>
      </div>

      {/* AI ALERT */}
      <div
        className={`live-alert-bar ${
          aiResult?.near_miss
            ? "critical"
            : liveRisk >= 60
            ? "high"
            : "normal"
        }`}
      >
        <div className="live-alert-title">
          <span className="live-alert-dot"></span>
          <strong>{liveAlert}</strong>
        </div>

        <span className="live-alert-description">
          {liveObjectPair}
        </span>

        <strong className="live-alert-score">
          Risk Score {aiResult ? `${liveRisk}%` : "--"}
        </strong>
      </div>

      {/* MAIN LIVE AREA */}
      <div className="live-detection-layout">

        {/* LEFT VIDEO PANEL */}
        <div className="live-video-panel">

          <div className="panel-title-row live-monitor-header">
            <div>
              <h3>CCTV Monitoring</h3>
              <span className="camera-location">
                {selectedJunction} — Camera {displayCamera}
              </span>
            </div>

            <div className="live-controls">

              <select
                value={selectedJunction}
                onChange={(e) => {
                  setSelectedJunction(e.target.value);
                  setAiResult(null);
                }}
              >
                <option>Junction A</option>
                <option>Junction B</option>
                <option>Main Road</option>
              </select>

              <select
                value={selectedCamera}
                onChange={(e) => {
                  setSelectedCamera(e.target.value);
                  setAiResult(null);
                }}
              >
                <option value="Camera 1">Camera {cameraPrefix}1</option>
                <option value="Camera 2">Camera {cameraPrefix}2</option>
                <option value="Camera 3">Camera {cameraPrefix}3</option>
              </select>

            </div>
          </div>

          {/* VIDEO */}
          <div className="live-video-wrapper">

            <video
              key={aiResult?.annotated_video || selectedVideo}
              src={
  aiResult?.annotated_video
    ? `http://127.0.0.1:8000${aiResult.annotated_video}`
    : selectedVideo
}
              autoPlay
              muted
              loop
              playsInline
              controls
              className="live-detection-video"
            />

            <div className="live-video-overlay">
              <span>
                ● LIVE
              </span>

              <span>
                {selectedJunction} • {displayCamera}
              </span>
            </div>

          </div>

          {/* VIDEO FOOTER */}
          <div className="live-video-footer">

            <div className="live-video-info">
              <span>
                CCTV: <strong>{displayCamera}</strong>
              </span>

              <span>
                Location: <strong>{selectedJunction}</strong>
              </span>

              {aiResult && (
                <span>
                  Objects: <strong>{aiResult.vehicle_count ?? "--"}</strong>
                </span>
              )}
            </div>

            <button
              type="button"
              className="analyze-button"
              onClick={runAIAnalysis}
            >
              Analyze Video
            </button>

          </div>

        </div>

        {/* RIGHT EVENT TIMELINE */}
        <div className="live-events-panel">

          <div className="panel-title-row">
            <div>
              <h3>Event Timeline</h3>
              <span className="timeline-subtitle">
                AI detected events from video
              </span>
            </div>

            <span className="live-pill">LIVE</span>
          </div>

          <div className="live-events-list">

            {aiResult?.timeline?.length > 0 ? (

              [...aiResult.timeline]
                .reverse()
                .map((event: any, index: number) => (

                  <div
                    className={`live-event-item ${event.type}`}
                    key={`${event.time}-${index}`}
                  >

                    <div className="live-event-icon">
                      {event.type === "near_miss"
                        ? "!"
                        : event.type === "high_risk"
                        ? "!"
                        : "•"}
                    </div>

                    <div className="live-event-content">

                      <div className="live-event-top">
                        <strong>{event.message}</strong>

                        <time>
                          {event.time}s
                        </time>
                      </div>

                      <span>
                        {selectedJunction} — Camera {displayCamera}
                      </span>

                      <small>
                        {event.details}
                      </small>

                    </div>

                  </div>

                ))

            ) : (

              <div className="no-events">

                <div className="no-events-icon">
                  ◉
                </div>

                <strong>
                  Waiting for AI detection
                </strong>

                <span>
                  Click Analyze Video to analyze the selected CCTV footage.
                </span>

              </div>

            )}

          </div>

        </div>

      </div>

      <button
        className="primary-button"
        onClick={() => setActivePage("Dashboard")}
      >
        ← Go to Dashboard
      </button>

    </div>
  );
}
  if (activePage === "Events") {
  return (
    <div className="events-page">

      <div className="events-page-header">
        <div>
          <h1>Events</h1>
          <p>Detected near-miss events and risk incidents</p>
        </div>

        <div className="events-live-status">
          <span className="events-status-dot"></span>
          AI Monitoring Active
        </div>
      </div>

      <div className="events-summary-grid">
        <div className="event-summary-card">
          <span className="event-summary-label">Total Events</span>
          <strong>{eventsData.length}</strong>
          <small>Detected incidents</small>
        </div>

        <div className="event-summary-card critical">
          <span className="event-summary-label">Critical</span>
          <strong>
            {eventsData.filter(
              (event) => event.risk === "CRITICAL"
            ).length}
          </strong>
          <small>Immediate attention</small>
        </div>

        <div className="event-summary-card high">
          <span className="event-summary-label">High Risk</span>
          <strong>
            {eventsData.filter(
              (event) => event.risk === "HIGH"
            ).length}
          </strong>
          <small>High-risk incidents</small>
        </div>

        <div className="event-summary-card medium">
          <span className="event-summary-label">Medium Risk</span>
          <strong>
            {eventsData.filter(
              (event) => event.risk === "MEDIUM"
            ).length}
          </strong>
          <small>Monitor events</small>
        </div>
      </div>

      <div className="events-table-card">

        <div className="events-table-header">
          <div>
            <h2>Recent Near-Miss Events</h2>
            <p>Latest incidents detected by the AI system</p>
          </div>

          <button className="events-refresh-btn">
            ↻ Refresh
          </button>
        </div>

        <div className="events-table-wrapper">
          <table className="events-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Time</th>
                <th>Location</th>
                <th>Objects Involved</th>
                <th>Risk Level</th>
                <th>Risk Score</th>
              </tr>
            </thead>

            <tbody>
              {eventsData.length > 0 ? (
                eventsData.map((event) => (
                  <tr key={event.id}>

                    <td>
                      <span className="event-id">
                        {event.id}
                      </span>
                    </td>

                    <td>
                      <span className="event-time">
                        {event.time}
                      </span>
                    </td>

                    <td>
                      <span className="event-location">
                        {event.location}
                      </span>
                    </td>

                    <td>
                      <span className="event-objects">
                        {event.objects}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`event-risk risk-${event.risk.toLowerCase()}`}
                      >
                        {event.risk}
                      </span>
                    </td>

                    <td>
                      <div className="event-score">
                        <strong>{event.score}</strong>
                        <span>/100</span>
                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="events-empty">
                    No events detected
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
  if (activePage === "Analyze Video") {
  return (
    <div className="analyze-page">

      <div className="analyze-page-header">
        <div>
          <h2>Analyze Video</h2>
          <p>
            Upload a video and let AI analyze vehicles, pedestrians,
            tracking and traffic risk interactions.
          </p>
        </div>

        <div className="analysis-page-status">
          <span className="status-dot"></span>
          AI Analysis Ready
        </div>
      </div>

      <div className="analyze-top-grid">

        <section className="analyze-card upload-card">
          <div className="analyze-card-title">
            <span>↑</span>
            <h3>Upload Video</h3>
          </div>

          <label className="video-upload-zone">
            <div className="upload-cloud">☁</div>

            <strong>Drag & drop your video here</strong>
            <span>or</span>

            <span className="choose-file-btn">
              Choose File
            </span>

            <small>
              Supports MP4, MOV, AVI · Maximum 500MB
            </small>

            <input
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file) {
                  handleVideoUpload(file);
                }
              }}
            />
          </label>

          {uploadedVideo && (
            <div className="selected-video-info">
              <div>
                <strong>{uploadedVideo.name}</strong>
                <span>
                  {(uploadedVideo.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUploadedVideo(null);
                  setUploadedVideoUrl("");
                  setUploadAnalysis(null);
                  setUploadProgress(0);
                }}
              >
                ×
              </button>
            </div>
          )}
        </section>


        <section className="analyze-card preview-card">

          <div className="analyze-card-title">
            <span>▶</span>
            <h3>Video Preview</h3>
          </div>

          <div className="video-preview-box">

            {uploadedVideoUrl ? (
              <video
                src={uploadedVideoUrl}
                controls
                className="uploaded-video"
              />
            ) : (
              <div className="preview-empty">
                <div className="preview-play">▶</div>

                <strong>No video selected</strong>

                <span>
                  Upload a traffic video to preview it here
                </span>
              </div>
            )}

          </div>

        </section>


        <section className="analyze-card settings-card">

          <div className="analyze-card-title">
            <span>⚙</span>
            <h3>Detection Settings</h3>
          </div>

          <div className="detection-options">

            <label>
              <input type="checkbox" defaultChecked />
              <span>Vehicles</span>
            </label>

            <label>
              <input type="checkbox" defaultChecked />
              <span>Pedestrians</span>
            </label>

            <label>
              <input type="checkbox" defaultChecked />
              <span>Near-misses Detection</span>
            </label>

            <label>
              <input type="checkbox" defaultChecked />
              <span>Tracking</span>
            </label>

          </div>

          <div className="analysis-mode-label">
            Analysis Mode
          </div>

          <select
            className="analysis-mode-select"
            defaultValue="Standard"
          >
            <option value="Standard">
              Standard
            </option>

            <option value="Detailed">
              Detailed
            </option>
          </select>

          <button
            type="button"
            className="start-analysis-btn"
            disabled={!uploadedVideo || isAnalyzingUpload}
            onClick={async () => {

              if (!uploadedVideo) return;

              setIsAnalyzingUpload(true);
              setUploadProgress(10);
              setUploadAnalysis(null);

              try {

                const formData = new FormData();

                formData.append(
                  "file",
                  uploadedVideo
                );

                setUploadProgress(25);

                const response = await fetch(
                  "http://127.0.0.1:8000/api/analyze-upload",
                  {
                    method: "POST",
                    body: formData,
                  }
                );

                setUploadProgress(75);

                const data = await response.json();

                console.log(
                  "UPLOADED VIDEO AI RESULT:",
                  data
                );

                if (data.status === "success") {

                  setUploadAnalysis(
                    data.result
                  );

                  setUploadProgress(100);

                } else {

                  console.error(
                    "UPLOAD ANALYSIS ERROR:",
                    data.message
                  );

                  setUploadProgress(0);
                }

              } catch (error) {

                console.error(
                  "Uploaded video analysis failed:",
                  error
                );

                setUploadProgress(0);

              } finally {

                setIsAnalyzingUpload(false);

              }

            }}
          >
            ▶ {isAnalyzingUpload
              ? "Analyzing..."
              : "Start Analysis"}
          </button>

        </section>

      </div>


      <div className="analyze-bottom-grid">

        <section className="analyze-card progress-card">

          <div className="progress-header">

            <div className="analyze-card-title">
              <span>◔</span>
              <h3>Analysis Progress</h3>
            </div>

            <strong>
              {uploadProgress}%
            </strong>

          </div>

          <div className="progress-track">

            <div
              className="progress-fill"
              style={{
                width: `${uploadProgress}%`,
              }}
            />

          </div>

          <div className="analysis-status">

            <span className="status-dot"></span>

            <div>

              <strong>
                {isAnalyzingUpload
                  ? "Processing video..."
                  : uploadAnalysis
                  ? "Analysis completed"
                  : uploadedVideo
                  ? "Video ready for analysis"
                  : "Upload a video to begin"}
              </strong>

              <span>
                {isAnalyzingUpload
                  ? "Detecting objects and calculating traffic risk."
                  : "AI results are generated from the uploaded video."}
              </span>

            </div>

          </div>

        </section>


        <section className="analyze-card summary-card">

          <div className="summary-header">

            <div className="analyze-card-title">
              <span>▥</span>
              <h3>Analysis Summary</h3>
            </div>

            <small>
              {uploadAnalysis
                ? "From uploaded video"
                : "After completion"}
            </small>

          </div>

          <div className="summary-row">
            <span>Total Objects</span>

            <strong>
              {uploadAnalysis?.vehicle_count ?? "--"}
            </strong>
          </div>

          <div className="summary-row">
            <span>Near-Misses Detected</span>

            <strong>
              {uploadAnalysis
                ? uploadAnalysis.near_miss
                  ? 1
                  : 0
                : "--"}
            </strong>
          </div>

          <div className="summary-row">
            <span>High-Risk Events</span>

            <strong>
              {uploadAnalysis
                ? uploadAnalysis.risk_level === "HIGH" ||
                  uploadAnalysis.risk_level === "CRITICAL"
                  ? 1
                  : 0
                : "--"}
            </strong>
          </div>

          <div className="summary-row">
            <span>Risk Level</span>

            <strong>
              {uploadAnalysis?.risk_level ?? "--"}
            </strong>
          </div>

          <div className="summary-row">
            <span>Risk Score</span>

            <strong>
              {uploadAnalysis?.risk_score != null
                ? `${uploadAnalysis.risk_score}%`
                : "--"}
            </strong>
          </div>

        </section>

      </div>

    </div>
  );
}

if (activePage === "Risk Map") {
  const riskDetails: Record<string, any> = {
    "Junction 1": {
      risk: "Critical",
      score: 87,
      events: 12,
      nearMisses: 8,
      location: "City Center Junction",
    },

    "Junction A": {
      risk: "High",
      score: 78,
      events: 6,
      nearMisses: 4,
      location: "Junction A",
    },

    "Junction B": {
      risk: "Low",
      score: 32,
      events: 1,
      nearMisses: 0,
      location: "Junction B",
    },

    "Main Road": {
      risk: "Medium",
      score: 61,
      events: 4,
      nearMisses: 2,
      location: "Main Road",
    },
  };

  const selected =
    riskDetails[selectedJunction] ||
    riskDetails["Junction A"];

  return (
    <div className="risk-map-page">

      {/* HEADER */}
      <div className="risk-page-header">
        <div>
          <h2>Risk Map</h2>
          <p>
            Real-time traffic risk hotspots and monitored junctions
          </p>
        </div>

        <div className="risk-active-status">
          <span></span>
          AI Monitoring Active
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="risk-main-grid">

        {/* MAP */}
        <div className="risk-map-card">

          <div className="risk-map-card-header">
            <div>
              <h3>Traffic Risk Overview</h3>
              <p>Live monitored traffic locations</p>
            </div>

            <div className="risk-map-actions">
              <button>Map</button>
              <button>Satellite</button>
            </div>
          </div>

          <div className="risk-map-area">

            <div
              ref={riskMapRef}
              className="risk-leaflet-map"
            ></div>

            {/* MAP LEGEND */}
            <div className="risk-map-legend-box">
              <strong>Risk Level</strong>

              <div>
                <i className="risk-dot critical"></i>
                Critical
              </div>

              <div>
                <i className="risk-dot high"></i>
                High
              </div>

              <div>
                <i className="risk-dot medium"></i>
                Medium
              </div>

              <div>
                <i className="risk-dot low"></i>
                Low
              </div>
            </div>

          </div>

        </div>

        {/* SELECTED JUNCTION */}
        <div className="selected-junction-card">

          <div className="selected-card-heading">
            <div>
              <h3>Selected Junction</h3>
              <p>Current risk information</p>
            </div>

            <span className="selected-menu">⋮</span>
          </div>

          <div className="junction-preview">
            <img
              src={trafficScene}
              alt="Traffic junction"
            />
          </div>

          <div className="junction-name">
            <h2>{selectedJunction}</h2>
            <p>📍 {selected.location}</p>
          </div>

          <div
            className={`junction-risk-badge ${selected.risk.toLowerCase()}`}
          >
            {selected.risk} Risk
          </div>

          <div className="junction-score">
            <div>
              <span>Risk Score</span>
              <strong>{selected.score}%</strong>
            </div>

            <div className="score-bar">
              <div
                style={{
                  width: `${selected.score}%`,
                }}
              ></div>
            </div>
          </div>

          <div className="junction-stat-grid">

            <div>
              <span>Events</span>
              <strong>{selected.events}</strong>
            </div>

            <div>
              <span>Near-Misses</span>
              <strong>{selected.nearMisses}</strong>
            </div>

          </div>

          <button className="junction-details-btn">
            View Junction Details →
          </button>

        </div>

      </div>

      {/* BOTTOM SUMMARY */}
      <div className="risk-bottom-cards">

        <div className="risk-bottom-card">
          <span className="bottom-icon critical-icon">!</span>
          <div>
            <p>Critical Risk</p>
            <strong>1</strong>
            <small>Junction 1</small>
          </div>
        </div>

        <div className="risk-bottom-card">
          <span className="bottom-icon high-icon">!</span>
          <div>
            <p>High Risk</p>
            <strong>1</strong>
            <small>Junction A</small>
          </div>
        </div>

        <div className="risk-bottom-card">
          <span className="bottom-icon medium-icon">!</span>
          <div>
            <p>Medium Risk</p>
            <strong>1</strong>
            <small>Main Road</small>
          </div>
        </div>

        <div className="risk-bottom-card">
          <span className="bottom-icon low-icon">✓</span>
          <div>
            <p>Low Risk</p>
            <strong>1</strong>
            <small>Junction B</small>
          </div>
        </div>

      </div>

    </div>
  );
}

if (activePage === "Reports") {
  return (
    <div className="reports-page">

      {/* HEADER */}
      <div className="reports-header">
        <div>
          <h2>Reports</h2>
          <p>Create and manage detailed traffic safety reports</p>
        </div>

        <div className="reports-filters">

  <button className="report-date-filter">
    📅 Sep 22, 2026 – Sep 26, 2026
  </button>

  <select
    className="report-location-select"
    value={reportLocation}
    onChange={(e) => {
      setReportLocation(e.target.value as "Junction A" | "Junction B" | "Main Road");
      setReportGenerated(false);
    }}
  >
    <option value="Junction A">Junction A</option>
    <option value="Junction B">Junction B</option>
    <option value="Main Road">Main Road</option>
  </select>

</div>
</div>

      {/* SUMMARY CARDS */}
      <div className="reports-summary-grid">

        <div className="report-stat-card">
          <div className="report-stat-icon blue">▣</div>
          <div>
            <span>Total Events</span>
            <strong>{reportDetails[reportLocation].total}</strong>
            <small className="report-positive">↑ 22%</small>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon blue">⚠</div>
          <div>
            <span>Near-Misses</span>
            <strong>{reportDetails[reportLocation].nearMisses}</strong>
            <small className="report-positive">↑ 18%</small>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon red">!</div>
          <div>
            <span>Critical Events</span>
            <strong>{reportDetails[reportLocation].critical}</strong>
            <small className="report-positive">↑ 40%</small>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon orange">⌖</div>
          <div>
            <span>High-Risk Junctions</span>
            <strong>{reportDetails[reportLocation].highRisk}</strong>
            <small className="report-positive">↑ 25%</small>
          </div>
        </div>

      </div>

      {/* CHARTS + ACTIONS */}
      <div className="reports-middle-grid">

        {/* SEVERITY */}
        <div className="report-panel severity-panel">
          <div className="report-panel-header">
            <div>
              <h3>Events by Severity</h3>
              <p>Distribution of detected events</p>
            </div>
          </div>

          <div className="severity-content">

            <div className="severity-donut">
              <div className="severity-donut-center">
                <strong>45</strong>
                <span>Total</span>
              </div>
            </div>

            <div className="severity-legend">

              <div>
                <span>
                  <i className="severity-dot critical"></i>
                  Critical
                </span>
                <strong>16% (7)</strong>
              </div>

              <div>
                <span>
                  <i className="severity-dot high"></i>
                  High
                </span>
                <strong>38% (17)</strong>
              </div>

              <div>
                <span>
                  <i className="severity-dot medium"></i>
                  Medium
                </span>
                <strong>33% (15)</strong>
              </div>

              <div>
                <span>
                  <i className="severity-dot low"></i>
                  Low
                </span>
                <strong>13% (6)</strong>
              </div>

            </div>

          </div>
        </div>

        {/* TREND */}
        <div className="report-panel trend-panel">

          <div className="report-panel-header">
            <div>
              <h3>Events Trend</h3>
              <p>Events detected over time</p>
            </div>

            <div className="trend-legend">
              <span>
                <i className="trend-blue"></i>
                Total Events
              </span>

              <span>
                <i className="trend-purple"></i>
                Near-Misses
              </span>
            </div>
          </div>

          <div className="trend-chart">

            <div className="trend-y-axis">
              <span>30</span>
              <span>20</span>
              <span>10</span>
              <span>0</span>
            </div>

            <div className="trend-graph">

              <div className="trend-grid-line line-1"></div>
              <div className="trend-grid-line line-2"></div>
              <div className="trend-grid-line line-3"></div>
              <div className="trend-grid-line line-4"></div>

              <svg
                viewBox="0 0 500 180"
                className="trend-svg"
                preserveAspectRatio="none"
              >
                <polyline
                  points="10,120 80,95 150,110 220,75 290,100 360,55 430,78 490,62"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                />

                <polyline
                  points="10,140 80,120 150,130 220,105 290,120 360,85 430,110 490,95"
                  fill="none"
                  stroke="#7c3aed"
                  strokeWidth="3"
                />

                {[10,80,150,220,290,360,430,490].map((x, i) => (
                  <circle
                    key={`blue-${i}`}
                    cx={x}
                    cy={[120,95,110,75,100,55,78,62][i]}
                    r="4"
                    fill="#2563eb"
                  />
                ))}

                {[10,80,150,220,290,360,430,490].map((x, i) => (
                  <circle
                    key={`purple-${i}`}
                    cx={x}
                    cy={[140,120,130,105,120,85,110,95][i]}
                    r="4"
                    fill="#7c3aed"
                  />
                ))}
              </svg>

              <div className="trend-x-axis">
                <span>Sep 22</span>
                <span>Sep 23</span>
                <span>Sep 24</span>
                <span>Sep 25</span>
                <span>Sep 26</span>
              </div>

            </div>
          </div>
        </div>

        {/* REPORT ACTIONS */}
        <div className="report-panel report-actions-panel">

          <div className="report-panel-header">
            <div>
              <h3>Report Actions</h3>
              <p>Export current report</p>
            </div>
          </div>

          <button className="download-report primary">
            ↓ &nbsp; Download PDF
          </button>

          <button className="download-report">
            ↓ &nbsp; Download CSV
          </button>

        </div>

      </div>

      {reportGenerated && (
  <div className="report-panel generated-report-panel">
    <div className="report-panel-header">
      <div>
        <h3>Generated Report</h3>
        <p>
          Report generated for {reportLocation}
        </p>
      </div>

      <span className="generated-status">Generated</span>
    </div>

    <div className="generated-report-details">
      <div>
        <span>Total Events</span>
        <strong>{reportDetails[reportLocation].total}</strong>
      </div>

      <div>
        <span>Near-Miss Events</span>
        <strong>{reportDetails[reportLocation].nearMisses}</strong>
      </div>

      <div>
        <span>Critical Events</span>
        <strong>{reportDetails[reportLocation].critical}</strong>
      </div>

      <div>
        <span>High Risk Events</span>
        <strong>{reportDetails[reportLocation].highRisk}</strong>
      </div>
    </div>

    <p className="generated-report-message">
      The report has been generated successfully for {reportLocation}.
    </p>
  </div>
)}

      {/* REPORT HISTORY */}
      <div className="report-panel report-history-panel">

        <div className="report-panel-header history-header">
          <div>
            <h3>Report History</h3>
            <p>Previously generated reports</p>
          </div>

          <button
  className="generate-report-btn"
  onClick={() => setReportGenerated(true)}
>
  + Generate Report
</button>
        </div>

        <div className="report-history-table">

          <div className="history-row history-head">
            <span>Date Range</span>
            <span>Location</span>
            <span>Type</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          <div className="history-row">
            <span>Sep 15 – Sep 21, 2025</span>
            <span>All Locations</span>
            <span>Weekly</span>
            <span>
              <b className="generated-status">Generated</b>
            </span>
            <span>
              <button className="history-download">
                ↓ Download
              </button>
            </span>
          </div>

          <div className="history-row">
            <span>Sep 08 – Sep 14, 2025</span>
            <span>Junction A</span>
            <span>Weekly</span>
            <span>
              <b className="generated-status">Generated</b>
            </span>
            <span>
              <button className="history-download">
                ↓ Download
              </button>
            </span>
          </div>

          <div className="history-row">
            <span>Sep 01 – Sep 07, 2025</span>
            <span>All Locations</span>
            <span>Weekly</span>
            <span>
              <b className="generated-status">Generated</b>
            </span>
            <span>
              <button className="history-download">
                ↓ Download
              </button>
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}
if (activePage === "Analytics") {
  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h2>Traffic Safety Analytics</h2>
          <p>Insights from traffic data and near-miss events</p>
        </div>

        <select className="analytics-date-filter">
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
        </select>
      </div>

      <div className="analytics-summary-grid">
        <div className="analytics-stat-card">
          <span>Total Events</span>
          <strong>114</strong>
          <small>↑ 12.4% vs previous</small>
        </div>

        <div className="analytics-stat-card">
          <span>Near-Misses</span>
          <strong>58</strong>
          <small>↑ 8.2% vs previous</small>
        </div>

        <div className="analytics-stat-card">
          <span>Critical Events</span>
          <strong>16</strong>
          <small>↓ 4.1% improvement</small>
        </div>

        <div className="analytics-stat-card">
          <span>Avg Risk Score</span>
          <strong>63%</strong>
          <small>↓ 6.8% improvement</small>
        </div>
      </div>

      <div className="analytics-main-grid">

        <div className="analytics-panel">
          <h3>Near-Misses by Hour</h3>
          <p>Hourly distribution of detected near-miss events</p>

          <div className="analytics-chart">
            <div style={{ height: "65%" }}></div>
            <div style={{ height: "35%" }}></div>
            <div style={{ height: "48%" }}></div>
            <div style={{ height: "80%" }}></div>
            <div style={{ height: "55%" }}></div>
            <div style={{ height: "92%" }}></div>
            <div style={{ height: "72%" }}></div>
            <div style={{ height: "45%" }}></div>
            <div style={{ height: "60%" }}></div>
            <div style={{ height: "38%" }}></div>
            <div style={{ height: "70%" }}></div>
            <div style={{ height: "50%" }}></div>
          </div>
        </div>

        <div className="analytics-panel">
          <h3>Near-Misses by Vehicle Type</h3>
          <p>Distribution across detected vehicle classes</p>

          <div className="vehicle-analytics">
            <div className="analytics-donut">
              <strong>24</strong>
              <span>Total</span>
            </div>

            <div className="analytics-legend">
              <div><span className="legend-dot car-dot"></span>Car — 42% (10)</div>
<div><span className="legend-dot motorcycle-dot"></span>Motorcycle — 29% (7)</div>
<div><span className="legend-dot bus-dot"></span>Bus — 13% (3)</div>
<div><span className="legend-dot truck-dot"></span>Truck — 8% (2)</div>
<div><span className="legend-dot others-dot"></span>Others — 8% (2)</div>
            </div>
          </div>
        </div>

      </div>

      <div className="analytics-bottom-grid">

        <div className="analytics-panel">
          <h3>Severity Distribution</h3>
          <p>Events grouped by risk level</p>

          <div className="severity-analytics">
            <div className="analytics-donut severity-donut">
              <strong>45</strong>
              <span>Total</span>
            </div>

            <div className="analytics-legend">
              <div><span className="legend-dot critical-dot"></span>Critical — 16% (7)</div>
<div><span className="legend-dot high-dot"></span>High — 38% (17)</div>
<div><span className="legend-dot medium-dot"></span>Medium — 33% (15)</div>
<div><span className="legend-dot low-dot"></span>Low — 13% (6)</div>
            </div>
          </div>
        </div>

        <div className="analytics-panel">
          <h3>Top Risky Locations</h3>
          <p>Locations with highest detected risk</p>

          <div className="risk-location">
            <span>Junction 1</span>
            <div><i style={{ width: "87%" }}></i></div>
            <strong>87%</strong>
          </div>

          <div className="risk-location">
            <span>Main Road</span>
            <div><i style={{ width: "72%" }}></i></div>
            <strong>72%</strong>
          </div>

          <div className="risk-location">
            <span>Cross Road</span>
            <div><i style={{ width: "60%" }}></i></div>
            <strong>60%</strong>
          </div>

          <div className="risk-location">
            <span>Junction 3</span>
            <div><i style={{ width: "54%" }}></i></div>
            <strong>54%</strong>
          </div>
        </div>

        <div className="analytics-panel">
          <h3>Trend Comparison</h3>
          <p>This week vs last week</p>

         <div className="trend-comparison">
  <svg
    className="trend-chart-svg"
    viewBox="0 0 500 180"
    preserveAspectRatio="none"
  >
    <line x1="35" y1="30" x2="480" y2="30" />
    <line x1="35" y1="65" x2="480" y2="65" />
    <line x1="35" y1="100" x2="480" y2="100" />
    <line x1="35" y1="135" x2="480" y2="135" />

    <polyline
      className="trend-week-line"
      points="35,115 105,92 175,103 245,78 315,91 395,62 480,80"
    />

    <polyline
      className="trend-last-line"
      points="35,128 105,115 175,120 245,108 315,116 395,100 480,108"
    />

    <circle cx="35" cy="115" r="3" className="trend-week-point" />
    <circle cx="105" cy="92" r="3" className="trend-week-point" />
    <circle cx="175" cy="103" r="3" className="trend-week-point" />
    <circle cx="245" cy="78" r="3" className="trend-week-point" />
    <circle cx="315" cy="91" r="3" className="trend-week-point" />
    <circle cx="395" cy="62" r="3" className="trend-week-point" />
    <circle cx="480" cy="80" r="3" className="trend-week-point" />

    <circle cx="35" cy="128" r="3" className="trend-last-point" />
    <circle cx="105" cy="115" r="3" className="trend-last-point" />
    <circle cx="175" cy="120" r="3" className="trend-last-point" />
    <circle cx="245" cy="108" r="3" className="trend-last-point" />
    <circle cx="315" cy="116" r="3" className="trend-last-point" />
    <circle cx="395" cy="100" r="3" className="trend-last-point" />
    <circle cx="480" cy="108" r="3" className="trend-last-point" />
  </svg>

  <div className="trend-days">
    <span>Mon</span>
    <span>Tue</span>
    <span>Wed</span>
    <span>Thu</span>
    <span>Fri</span>
    <span>Sat</span>
    <span>Sun</span>
  </div>
</div>

          <div className="trend-labels">
            <span>● This Week</span>
            <span>● Last Week</span>
          </div>
        </div>

      </div>
    </div>
    );
}

if (activePage === "Settings") {
  return (
    <div className="settings-page">

      {/* HEADER */}
      <div className="settings-header">
        <div>
          <h2>Settings</h2>
          <p>
            Manage your profile, detection preferences and system settings
          </p>
        </div>

        <div className="settings-user">
          <div className="settings-avatar">H</div>
          <strong>Harika</strong>
          <span>⌄</span>
        </div>
      </div>

      {/* SETTINGS GRID */}
      <div className="settings-grid">

        {/* PROFILE SETTINGS */}
        <section className="settings-card">

          <div className="settings-card-header">
            <h3>Profile Settings</h3>
          </div>

          <div className="profile-info">

            <div className="profile-mini">
              <div className="profile-mini-avatar">H</div>

              <div>
                <strong>Chandra Harika</strong>
                <span>harikahoney297@gmail.com</span>
              </div>
            </div>

          </div>

          <label className="settings-field">
            <span>Full Name</span>
            <input
              type="text"
              defaultValue="Chandra Harika"
            />
          </label>

          <label className="settings-field">
            <span>Email</span>
            <input
              type="email"
              defaultValue="harikahoney297@gmail.com"
            />
          </label>

          <label className="settings-field">
            <span>Role</span>
            <input
              type="text"
              defaultValue="Analyst"
              readOnly
            />
          </label>

          <button className="settings-primary-btn">
            Update Profile
          </button>

        </section>


        {/* DETECTION THRESHOLDS */}
        <section className="settings-card">

          <div className="settings-card-header">
            <h3>Detection Thresholds</h3>
          </div>

          <div className="threshold-item">

            <div className="threshold-label">
              <span>Near-miss distance (m)</span>
              <strong>3.0</strong>
            </div>

            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              defaultValue="3"
            />

          </div>


          <div className="threshold-item">

            <div className="threshold-label">
              <span>Risk score threshold (%)</span>
              <strong>70</strong>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              defaultValue="70"
            />

          </div>


          <div className="threshold-item">

            <div className="threshold-label">
              <span>Vehicle confidence (%)</span>
              <strong>80</strong>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              defaultValue="80"
            />

          </div>


          <div className="threshold-item">

            <div className="threshold-label">
              <span>Pedestrian confidence (%)</span>
              <strong>85</strong>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              defaultValue="85"
            />

          </div>

        </section>


        {/* ALERT PREFERENCES */}
        <section className="settings-card">

          <div className="settings-card-header">
            <h3>Alert Preferences</h3>
          </div>

          <div className="settings-toggle-list">

            <label className="settings-toggle-row">
              <span>
                <strong>Email Alerts</strong>
                <small>Receive important alerts by email</small>
              </span>

              <input
                type="checkbox"
                defaultChecked
              />
            </label>


            <label className="settings-toggle-row">
              <span>
                <strong>In-App Notifications</strong>
                <small>Show alerts inside the dashboard</small>
              </span>

              <input
                type="checkbox"
                defaultChecked
              />
            </label>


            <label className="settings-toggle-row">
              <span>
                <strong>Critical Event Alerts</strong>
                <small>Notify when critical risk is detected</small>
              </span>

              <input
                type="checkbox"
                defaultChecked
              />
            </label>


            <label className="settings-toggle-row">
              <span>
                <strong>Daily Summary</strong>
                <small>Receive daily traffic safety summary</small>
              </span>

              <input
                type="checkbox"
              />
            </label>

          </div>

        </section>


        {/* SYSTEM SETTINGS */}
        <section className="settings-card">

          <div className="settings-card-header">
            <h3>System Settings</h3>
          </div>

          <div className="settings-toggle-list">

            <label className="settings-toggle-row">
              <span>
                <strong>Auto-delete processed videos</strong>
                <small>Remove uploaded videos after analysis</small>
              </span>

              <input
                type="checkbox"
                defaultChecked
              />
            </label>


            <label className="settings-toggle-row">
              <span>
                <strong>Dark Mode</strong>
                <small>Use dark interface theme</small>
              </span>

              <input
                type="checkbox"
              />
            </label>

          </div>


          <div className="settings-video-row">

            <div>
              <strong>Max video size</strong>
              <span>Maximum upload size</span>
            </div>

            <select defaultValue="500 MB">
              <option>250 MB</option>
              <option>500 MB</option>
              <option>1 GB</option>
            </select>

          </div>


          <button className="settings-save-btn">
            Save Changes
          </button>

        </section>

      </div>

    </div>
  );
}
  };



  
  return (
    <div className="app-shell">
      {/* ================= SIDEBAR ================= */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-shield">
            <span>▲</span>
          </div>

          <div>
            <h2>NearMiss AI</h2>
            <p>Safer Roads, Brighter Future</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`sidebar-link ${
                activePage === item.name ? "active" : ""
              }`}
              onClick={() => setActivePage(item.name)}
            >
              <span className="sidebar-link-icon">{item.icon}</span>

              <span className="sidebar-link-text">{item.name}</span>

              {item.live && <span className="live-pill">LIVE</span>}
            </button>
          ))}

          <button
            className={`sidebar-link ${
              activePage === "Settings" ? "active" : ""
            }`}
            onClick={() => setActivePage("Settings")}
          >
            <span className="sidebar-link-icon">⚙</span>
            <span className="sidebar-link-text">Settings</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="safer-roads-card">
            <div className="safer-roads-icon">🛡️</div>
            <h3>Safer Roads</h3>
            <strong>Brighter Future</strong>
            <p>AI powered insights for smarter traffic management.</p>
          </div>

          <div className="sidebar-profile">
            <div className="profile-avatar-large">H</div>

            <div className="profile-text">
              <strong>Harika</strong>
              <span>Admin</span>
            </div>

            <span className="profile-arrow">⌄</span>
          </div>
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <main className="main-content">
        {/* TOP SEARCH BAR */}
        <header className="top-header">
          <div className="global-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search locations, events, or vehicle types..."
            />
          </div>

          <div className="header-right">
            <button className="notification-button">
              🔔
              <span className="notification-count">3</span>
            </button>

            <div className="header-profile">
              <div className="header-avatar">H</div>

              <div>
                <strong>Harika</strong>
                <span>Admin</span>
              </div>

              <span className="dropdown-arrow">⌄</span>
            </div>
          </div>
        </header>

        {activePage === "Dashboard" ? (
  <div className="dashboard-page">
            {/* ================= BANNER ================= */}
            <section className="dashboard-banner">
              <div className="banner-left">
                <div className="banner-road-icon">◢</div>

                <div>
                  <h1>NearMiss AI</h1>
                  <p>Real-time Traffic Risk Detection &amp; Prediction</p>
                </div>
              </div>

              <div className="banner-message">
                <strong>Detecting near-misses today,</strong>
                <span>preventing accidents tomorrow.</span>
              </div>

              <div className="banner-visual">
                🚘 🚦 🚙
              </div>

              <div className="banner-controls">
                <button className="date-button">
                  📅 Sep 25, 2026 &nbsp; 6:42 PM ⌄
                </button>

                <div className="live-system">
                  <span className="online-dot"></span>
                  Live System
                </div>
              </div>
            </section>

            {/* ================= KPI CARDS ================= */}
            <section className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon blue-icon">◉</div>
                <div>
                  <span>Cameras Online</span>
                  <strong>4 <small>/ 4</small></strong>
                  <p className="success-text">● All systems operational</p>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon purple-icon">🚗</div>
                <div>
                  <span>Total Objects Detected</span>
                  <strong>482</strong>
                  <p className="positive-text">↑ 12% from yesterday</p>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon red-icon">!</div>
                <div>
                  <span>Near-Miss Events</span>
                  <strong>14</strong>
                  <p className="positive-text">↑ 3% from yesterday</p>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon orange-icon">!</div>
                <div>
                  <span>High Risk Events</span>
                  <strong>5</strong>
                  <p className="positive-text">↑ 2 from yesterday</p>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon green-icon">●</div>
                <div>
                  <span>Most Risky Location</span>
                  <strong>Junction A</strong>
                  <p>6 events (43%)</p>
                </div>
              </div>
            </section>

          {/* ================= LIVE / ALERTS / AI ================= */}
<section className="top-dashboard-grid">

  {/* LIVE DETECTION */}
  
  <div className="dashboard-panel live-detection-panel">
    <div className="panel-title-row">
      <div>
        <div className="panel-title-with-live">
          <span className="red-live-dot"></span>
          <h3>Live Detection</h3>
          <span className="tiny-live-badge">LIVE</span>
        </div>
      </div>

      <div className="panel-selects">
        <select
  value={selectedJunction}
  onChange={(e) => setSelectedJunction(e.target.value)}
>
          <option>Junction A</option>
          <option>Junction B</option>
          <option>Main Road</option>
        </select>

        <select
  value={selectedCamera}
  onChange={(e) => setSelectedCamera(e.target.value)}
>
          <option>Camera 1</option>
          <option>Camera 2</option>
          <option>Camera 3</option>
        </select>
      </div>
    </div>

    <button
  type="button"
  className="analyze-button"
  onClick={runAIAnalysis}
>
  Analyze Video
</button>



    <div className="camera-view">
      <div className="camera-scene">

       <video
  src={
  aiResult?.annotated_video
    ? `http://127.0.0.1:8000${aiResult.annotated_video}`
    : selectedVideo
}
  
  autoPlay
  muted
  loop
  playsInline
  className="traffic-scene-video"
/>
<div className="camera-overlay-time">
  2026-09-25 18:42:31
</div>

<div className="camera-overlay-info">
  FPS: 24&nbsp;&nbsp; | &nbsp;&nbsp;Objects: 8&nbsp;&nbsp; |{" "}
  <strong>Risk: HIGH</strong>
</div>

        {/* CAMERA INFORMATION */}
        <div className="camera-overlay-time">
          2026-09-25 18:42:31
        </div>

        <div className="camera-overlay-info">
          FPS: 24&nbsp;&nbsp; | &nbsp;&nbsp;Objects: 8&nbsp;&nbsp; |{" "}
          <strong>Risk: HIGH</strong>
        </div>

      </div>
    </div>
  </div>


  {/* CURRENT ALERTS */}
  <div className="dashboard-panel alerts-panel">

    <div className="panel-title-row">
      <div className="panel-title-with-icon">
        <span className="panel-red-icon">🔔</span>
        <h3>Current Alerts</h3>
      </div>

      <span className="new-alert-count">3 new alerts</span>
    </div>

    <div className="alerts-list">

  

      {alerts.slice(0, 3).map((alert) => (
  <div className="alert-item" key={alert.id}>

    <div className="alert-thumbnail">
      <img
  src={
    alert.id === 1
      ? nearMiss1
      : alert.id === 2
      ? nearMiss2
      : nearMiss3
  }
  alt={`Traffic alert ${alert.id}`}
  style={{
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    borderRadius: "8px",
  }}
/>
    </div>

    <div className="alert-content">

      <div className="alert-top-line">
        <RiskBadge level={alert.risk_level} />
      </div>

      <strong>{alert.alert}</strong>

      <div className="alert-meta">
        <span>⌖ {alert.junction}</span>
        <span>📹 {alert.camera}</span>
      </div>

      <div className="alert-object-row">
        <span>Near-miss event</span>
        <strong>{alert.risk_score}%</strong>
      </div>

    </div>

    <span className="alert-arrow">›</span>

  </div>
))}

    </div>

    <button className="view-alerts-button">
      View All Alerts →
    </button>

  </div>



 {/* AI RISK ANALYSIS */}
<div className="dashboard-panel ai-analysis-panel">
  <div className="panel-title-row">
    <div className="panel-title-with-icon">
      <span className="panel-blue-icon">✦</span>
      <h3>AI Risk Analysis</h3>
    </div>

    <button className="how-link">How it works?</button>
  </div>

  <div className="ai-risk-summary">
    <div>
      <span className="ai-label">Current Risk Level</span>
      <strong className="ai-risk-value">
  {aiResult?.risk_level || "WAITING"}
</strong>
      <small>Based on detected traffic interactions</small>
    </div>

    <div className="ai-risk-score">
      <span>Risk Score</span>
      <strong>{aiResult?.risk_score ?? "--"}%</strong>
    </div>
  </div>
    {aiResult?.near_miss && (
    <div className="near-miss-alert">
      🚨 NEAR-MISS DETECTED
    </div>
  )}

  <div className="ai-analysis-grid">
    <div className="ai-analysis-item">
      <span className="ai-analysis-number">01</span>
      <div>
        <strong>Object Detection</strong>
        <span>Vehicles &amp; pedestrians detected</span>
      </div>
    </div>

    <div className="ai-analysis-item">
      <span className="ai-analysis-number">02</span>
      <div>
        <strong>Movement Tracking</strong>
        <span>Tracks position and movement</span>
      </div>
    </div>

    <div className="ai-analysis-item">
      <span className="ai-analysis-number">03</span>
      <div>
        <strong>Risk Analysis</strong>
        <span>Distance, speed &amp; trajectory</span>
      </div>
    </div>

    <div className="ai-analysis-item">
      <span className="ai-analysis-number">04</span>
      <div>
        <strong>Near-Miss Prediction</strong>
        <span>Calculates collision risk</span>
      </div>
    </div>
  </div>

  <div className="risk-legend">
    <span>
      <i className="green-dot"></i>Low
    </span>
    <span>
      <i className="yellow-dot"></i>Medium
    </span>
    <span>
      <i className="orange-dot"></i>High
    </span>
    <span>
      <i className="red-dot"></i>Critical
    </span>
  </div>
</div>
</section>
            {/* ================= RISK MAP + RECENT EVENTS ================= */}
            <section className="middle-dashboard-grid">
              {/* RISK MAP */}
              <div className="dashboard-panel risk-map-panel">
                <div className="panel-title-row">
                  <div>
                    <h3>Risk Map</h3>
                    <p>Live view of high-risk locations (Demo data)</p>
                  </div>

                  <div className="map-legend">
                    <span>
                      <i className="red-dot"></i>High Risk
                    </span>
                    <span>
                      <i className="orange-dot"></i>Medium Risk
                    </span>
                    <span>
                      <i className="green-dot"></i>Low Risk
                    </span>
                  </div>
                </div>

                <div className="map-container real-map">
  <div id="risk-map" ref={mapRef}></div>
</div>
</div>

              {/* RECENT EVENTS */}
              <div className="dashboard-panel recent-events-panel">
                <div className="panel-title-row">
                  <h3>Recent Near-Miss Events</h3>
                  <button className="how-link">View All</button>
                </div>

                <div className="recent-events-list">
                  {eventsData.map((event, index) => (
                    <div className="recent-event" key={event.id}>
                      <div className="event-thumbnail">
  <img
    src={
      event.id === "NM-014"
        ? nearMiss1
        : event.id === "NM-013"
        ? nearMiss2
        : event.id === "NM-012"
        ? nearMiss3
        : event.id === "NM-011"
        ? nearMiss4
        : nearMiss5
    }
    alt={`Near-miss event ${event.id}`}
  />
</div>

                      <div className="recent-event-main">
                        <strong>{event.id}</strong>
                        <span>{event.objects}</span>
                      </div>

                      <div className="recent-event-meta">
                        <span>◷ {event.time}</span>
                        <span>⌖ {event.location}</span>
                      </div>

                      <RiskBadge level={event.risk} />

                      <strong className="score-value">{event.score}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ================= BOTTOM ANALYTICS ================= */}
            <section className="bottom-dashboard-grid">
              {/* EVENT TYPE */}
              <div className="dashboard-panel small-chart-panel">
                <div className="panel-title-row">
                  <h3>Event Type Distribution</h3>
                </div>

                <div className="donut-layout">
                  <div className="donut event-donut">
                    <div className="donut-center">
                      <strong>14</strong>
                      <span>Total Events</span>
                    </div>
                  </div>

                  <div className="donut-legend">
                    {eventTypeData.map((item, index) => (
                      <div className="legend-row" key={item.label}>
                        <span>
                          <i
                            className={`legend-dot legend-${index + 1}`}
                          ></i>
                          {item.label}
                        </span>
                        <strong>
                          {item.value}{" "}
                          <small>({item.percent}%)</small>
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RISK LEVEL */}
              <div className="dashboard-panel small-chart-panel">
                <div className="panel-title-row">
                  <h3>Risk Level Distribution</h3>
                </div>

                <div className="donut-layout">
                  <div className="donut risk-donut">
                    <div className="donut-center">
                      <strong>14</strong>
                      <span>Total Events</span>
                    </div>
                  </div>

                  <div className="donut-legend">
                    {riskData.map((item) => (
                      <div className="legend-row" key={item.label}>
                        <span>
                          <i className={`legend-dot ${item.className}`}></i>
                          {item.label}
                        </span>
                        <strong>
                          {item.value}{" "}
                          <small>({item.percent}%)</small>
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* VEHICLE TYPE */}
              <div className="dashboard-panel vehicle-analysis-panel">
                <div className="panel-title-row">
                  <h3>Vehicle Type Analysis</h3>
                </div>

                <div className="vehicle-list">
                  {vehicleData.map((vehicle) => (
                    <div className="vehicle-row" key={vehicle.label}>
                      <span className="vehicle-name">
                        <b>{vehicle.icon}</b>
                        {vehicle.label}
                      </span>

                      <div className="vehicle-progress">
                        <span
                          style={{ width: `${vehicle.percent * 2.5}%` }}
                        ></span>
                      </div>

                      <strong>{vehicle.value}</strong>
                      <small>({vehicle.percent}%)</small>
                    </div>
                  ))}
                </div>
              </div>

              {/* EVENTS BY TIME */}
              <div className="dashboard-panel events-time-panel">
                <div className="panel-title-row">
                  <div>
                    <h3>Events by Time</h3>
                  </div>

                  <span className="peak-badge">Peak Risk Period 6 PM – 8 PM</span>
                </div>

                <div className="bar-chart">
                  {hourlyBars.map((height, index) => (
                    <div className="bar-wrapper" key={index}>
                      <div
                        className={`time-bar ${
                          index >= 18 && index <= 20 ? "peak-bar" : ""
                        }`}
                        style={{ height: `${height * 7}px` }}
                      ></div>
                    </div>
                  ))}
                </div>

                <div className="time-labels">
                  <span>12 AM</span>
                  <span>6 AM</span>
                  <span>12 PM</span>
                  <span>6 PM</span>
                  <span>12 AM</span>
                </div>
              </div>

              {/* QUICK ACTIONS */}
              <div className="dashboard-panel quick-actions-panel">
                <div className="panel-title-row">
                  <h3>Quick Actions</h3>
                </div>

                <div className="quick-actions">
                  <button
                    className="quick-primary"
                    onClick={() => setActivePage("Analyze Video")}
                  >
                    ⬆ Upload Video
                  </button>

                  <button
                    onClick={() => setActivePage("Live Detection")}
                  >
                    ▶ Start Live Detection
                  </button>

                  <button onClick={() => setActivePage("Reports")}>
                    ▤ Generate Report
                  </button>

                  <button onClick={() => setActivePage("Settings")}>
                    ⚙ Settings
                  </button>
                </div>
              </div>
            </section>

            <footer className="dashboard-footer">
              <span>
                NearMiss AI &nbsp; v1.0.0 &nbsp; | &nbsp; Identifying traffic
                risks before they become accidents.
              </span>

              <span>
                NearMiss AI identifies observable traffic risk indicators from
                video. It is a decision-support prototype and does not
                guarantee that every detected event represents an actual
                accident or that every dangerous situation will be detected.
              </span>
                        </footer>
          </div>
        ) : (
          renderPlaceholder()
        )}
      </main>
    </div>
  );
}



export default App;