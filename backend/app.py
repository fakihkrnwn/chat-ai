from fastapi import FastAPI
from langchain_ollama import ChatOllama
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import logging
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the model
local_llm = "llama3.2:1b-instruct-q4_K_M"
llm = ChatOllama(
    model=local_llm,
    temperature=0,
    base_url="http://localhost:11434"
)


# Define a request model
class QueryRequest(BaseModel):
    question: str

logging.basicConfig(level=logging.INFO)

@app.post("/query/")
def query(request: QueryRequest):
    try:
        logging.info(f"Received query: {request.question}")
        response = llm.invoke(request.question)
        logging.info(f"Generated response: {response}")

        if isinstance(response, dict) and "content" in response:
            return {"response": response["content"]}
        elif hasattr(response, "content"):
            return {"response": response.content}
        else:
            return {"response": str(response)}

    except Exception as e:
        logging.error(f"Error processing query: {e}")
        return {"response": f"Error in processing query: {str(e)}"}