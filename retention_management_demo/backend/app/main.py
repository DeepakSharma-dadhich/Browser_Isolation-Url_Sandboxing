from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.retention_routes import router as retention_router


app = FastAPI(title="ArkMail Retention Management Demo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production: restrict to your admin dashboard origin.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(retention_router)


@app.get("/health")
def health():
    return {"status": "ok"}
