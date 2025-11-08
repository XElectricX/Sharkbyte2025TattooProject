from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, Form, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import google.generativeai as genai_dep
from google import genai
from PIL import Image
from io import BytesIO
import os, io, base64

app = FastAPI()


from fastapi.staticfiles import StaticFiles

app.mount("/static", StaticFiles(directory="static"), name="static")


# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
genai_dep.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Tell FastAPI where to find templates
templates = Jinja2Templates(directory="templates")

# ----------------------- HTML ENDPOINT ------------------------
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Show the upload form."""
    return templates.TemplateResponse("index.html", {"request": request, "result": None})

# ---------------------- GENERATION ENDPOINT -------------------
@app.post("/generate-tattoo/", response_class=HTMLResponse)
async def generate_tattoo(
    request: Request,
    photo: UploadFile = File(...),
    style: str = Form(...),
    theme: str = Form(...),
    color_mode: str = Form(...),
    size: str = Form(...)
):
    try:
        client = genai.Client()
        image_bytes = await photo.read()
        image = Image.open(BytesIO(image_bytes))

        prompt = f"""
        You are a professional tattoo designer.
        USING ONLY THE IMAGE PROVIDED, design a {color_mode} {style} tattoo with the theme "{theme}".
        It should be appropriate for a {size} placement on the provided body photo.
        Keep the original image intact — only overlay the tattoo realistically.
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt, image],
        )

        description = ""
        generated_image = None

        for part in response.parts:
            if part.text:
                description += part.text
            elif part.inline_data:
                generated_image = part.as_image()

        base64_img = None
        if generated_image:
            buffer = BytesIO()
            generated_image.save("generated_image.png")
            base64_img = base64.b64encode(buffer.getvalue()).decode()

        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "result": {
                    "idea": description,
                    "style": style,
                    "theme": theme,
                    "color_mode": color_mode,
                    "size": size,
                    "image_base64": base64_img,
                },
            },
        )

    except Exception as e:
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "error": str(e), "result": None},
        )
