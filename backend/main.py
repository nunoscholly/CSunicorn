from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ml.model import predict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/predict")
def run_predict(payload: dict):
    result = predict(payload.get("features", []))
    return {"prediction": result}
