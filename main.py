import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from PIL import Image
import io
import os

app = FastAPI()

# allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

@app.post("/generate-tattoo/")
async def generate_tattoo(
    photo: UploadFile = File(...),
    style: str = Form(...),
    theme: str = Form(...),
    color_mode: str = Form(...),
    size: str = Form(...)
):
    img_bytes = await photo.read()
    image = Image.open(io.BytesIO(img_bytes))

    prompt = f"""
    You are a professional tattoo designer.
    Design a {color_mode} {style} tattoo with the theme "{theme}".
    It should be appropriate for a {size} placement.
    Describe the final design clearly so it can be shown to the user.
    """

    model = genai.GenerativeModel("gemini-1.5-flash")
    resp = model.generate_content([prompt, image])

    return {
        "idea": resp.text,
        "style": style,
        "theme": theme,
        "color_mode": color_mode,
        "size": size
    }