from fastapi import FastAPI
from pydantic import BaseModel
from browser_controller import open_url

app = FastAPI()


class AnalyzeRequest(BaseModel):
    url: str


@app.get("/")
def home():
    return {
        "success": True,
        "message": "VM Agent Running"
    }


@app.post("/analyze")
def analyze_url(request: AnalyzeRequest):

    result = open_url(request.url)

    return {
        "success": True,
        "status": "completed",
        "url": request.url,
        "title": result["title"]
    }
