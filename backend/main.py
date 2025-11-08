from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from PIL import Image
import io
import os

app = FastAPI()

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

@app.post("/generate-tattoo/")
async def generate_tattoo(
    photo: UploadFile = File(...),
    style: str = Form(...),
    theme: str = Form(...),
    color_mode: str = Form(...),
    size: str = Form(...)
):
    try:
        # Read and open image
        img_bytes = await photo.read()
        image = Image.open(io.BytesIO(img_bytes))

        # Create prompt
        prompt = f"""
        You are a professional tattoo designer.
        Design a {color_mode} {style} tattoo with the theme "{theme}".
        It should be appropriate for a {size} placement.
        Describe the final design clearly so it can be shown to the user.
        """

        # Use multimodal Gemini model
        model = genai.GenerativeModel("gemini-flash-latest")

    

        # Convert image to bytes
        image_bytes = io.BytesIO()
        image.save(image_bytes, format="PNG")
        image_bytes.seek(0)

        # Create the model
        model = genai.GenerativeModel("gemini-flash-latest")

        # Generate content with prompt and image
        response = model.generate_content([
            prompt,
            {
                "mime_type": "image/png",
                "data": image_bytes.read()
            }
        ])



        # Return result
        return {
            "idea": response.text,
            "style": style,
            "theme": theme,
            "color_mode": color_mode,
            "size": size
        }

    except Exception as e:
        return {"error": str(e)}
