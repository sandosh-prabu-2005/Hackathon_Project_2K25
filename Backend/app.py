from fastapi import FastAPI # type: ignore
from pydantic import BaseModel # type: ignore
from chatbot import chat_with_gemini

app = FastAPI(title="Gemini Chatbot API")

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@app.get("/")
def root():
    return {"message": "Gemini Chatbot API. Use POST /chat with {\"message\": \"your question\"}"}

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    reply = chat_with_gemini(request.message)
    return {"reply": reply}
