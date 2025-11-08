import os
import base64
from io import BytesIO
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from PIL import Image
from google import genai

# -------------------- Load Environment --------------------
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY not set in .env")

client = genai.Client(api_key=API_KEY)

# -------------------- FastAPI Setup --------------------
app = FastAPI()
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- Routes --------------------
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "result": None, "error": None},
    )


@app.post("/generate-tattoo/", response_class=HTMLResponse)
async def generate_tattoo(
    request: Request,
    photo: UploadFile = File(...),
    style: str = Form(...),
    theme: str = Form(...),
    color_mode: str = Form(...),
    size: str = Form(...),
):
    try:
        # --- Read uploaded image ---
        image_bytes = await photo.read()
        user_image = Image.open(BytesIO(image_bytes))

        # Convert uploaded image to base64
        upload_buffer = BytesIO()
        user_image.save(upload_buffer, "PNG")
        uploaded_image_base64 = base64.b64encode(upload_buffer.getvalue()).decode()

        # --- Build prompt ---
        prompt = f"""
You are a professional tattoo designer.
Design a {color_mode} {style} tattoo with the theme "{theme}".
It should fit naturally as a {size} tattoo on the provided body photo.
Return both a design concept and an overlay image if possible.
"""

        # --- Call Gemini image model ---
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt, user_image],
        )

        description = ""
        generated_image_base64 = None

        # --- Parse parts ---
        for part in response.parts:
            # Text part
            if getattr(part, "text", None):
                description += part.text
            # Image part
            elif getattr(part, "inline_data", None):
                img_data = part.inline_data.data

                # Try to load image data into PIL safely
                try:
                    gen_img = Image.open(BytesIO(img_data))
                    # Save to static folder
                    output_path = "static/generated_image.png"
                    gen_img.save(output_path)
                    # Convert to base64 for web display
                    buffer = BytesIO()
                    gen_img.save(buffer, "PNG")
                    generated_image_base64 = base64.b64encode(buffer.getvalue()).decode()
                except Exception:
                    # Fallback — directly base64-encode raw bytes
                    generated_image_base64 = base64.b64encode(img_data).decode()

        if not description:
            description = "AI returned an image but no description."

        # --- Render back to HTML ---
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "result": {
                    "idea": description,
                    "uploaded_image_base64": uploaded_image_base64,
                    "generated_image_base64": generated_image_base64,
                    "style": style,
                    "theme": theme,
                    "color_mode": color_mode,
                    "size": size,
                },
                "error": None,
            },
        )

    except Exception as e:
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "result": None, "error": str(e)},
        )
