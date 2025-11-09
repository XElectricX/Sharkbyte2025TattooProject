import os
import base64
from io import BytesIO
from dotenv import load_dotenv
from typing import Optional
from fastapi import FastAPI, File, Form, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
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

@app.post("/generate-tattoo")
@app.post("/generate-tattoo/", response_class=HTMLResponse)
async def generate_tattoo(
	request: Request,
	photo: UploadFile = File(...),
	reference: Optional[UploadFile] = File(None),
	style: str = Form(...),
	theme: str = Form(...),
	color_mode: str = Form(...),
	physical_attributes: str = Form(...),
):
	try:
		# --- Read uploaded image ---
		image_bytes = await photo.read()
		user_image = Image.open(BytesIO(image_bytes))

		# Convert uploaded image to base64
		upload_buffer = BytesIO()
		user_image.save(upload_buffer, "PNG")
		uploaded_image_base64 = base64.b64encode(upload_buffer.getvalue()).decode()

		# --- Build prompt dynamically to avoid empty fields ---
		lines = [
			"You generate images of tattoos overlayed on skin of submitted images.",
			"Based on the provided input data, create a tattoo design that fits naturally on the body part shown.",
			"Input data:",
			"- Photo: An attached image of a body part (can be a hand, arm, leg, face, etc.)",
		]

		# If a reference image is provided, instruct the model to use it as
		# the design inspiration.
		if reference is not None:
			lines.append("- Reference Image: An attached image that serves as the inspiration for the tattoo design. Use it as the primary reference for style/subject where appropriate.")

		# Always include any textual style hints that were provided. Even when
		# a reference image is present we should still honor explicit fields
		# like style or color_mode (for example: "black and white").
		if theme:
			if reference is None:
				lines.append(f"- Theme (general description of tattoo): {theme}")
			else:
				# If both theme and style are provided
				lines.append(f"- Theme (supplementary details for the tattoo based off the chosen reference image): {theme}")
		if style:
			lines.append(f"- Style (artistic style of tattoo): {style}")
		if color_mode:
			lines.append(f"- Color Mode (examples: black and white, rainbow color, monochrome, etc.): {color_mode}")

		if physical_attributes:
			lines.append(f"- Physical Attributes (size/placement): {physical_attributes}")

		lines.append("")
		lines.append("Do not generate any text in your response. Your response should only consist of a generated image.")
		lines.append("Do not modify the original image except to add the tattoo design.")

		prompt = "\n".join(lines)

		# --- Call Gemini image model ---
		contents = [prompt, user_image]
		# If a reference image file was uploaded, include it as an additional
		# content item so the model can use it as inspiration.
		if reference is not None:
			try:
				ref_bytes = await reference.read()
				ref_img = Image.open(BytesIO(ref_bytes))
				contents.append(ref_img)
			except Exception:
				# ignore reference read errors and continue without it
				pass

		response = client.models.generate_content(
			model="gemini-2.5-flash-image",
			contents=contents,
		)

		generated_text = ""
		generated_image_base64 = None

		# --- Parse parts ---
		parts = getattr(response, "parts", []) or []
		for part in parts:
				# Text part
				if getattr(part, "text", None):
					generated_text += part.text
				# Image part
				elif getattr(part, "inline_data", None):
					img_data = part.inline_data.data

					# Try to load image data into PIL safely
					try:
						gen_img = Image.open(BytesIO(img_data))
						# Save to /generated_images/ and avoid replacing old files by
						# appending an incrementing number: generated_image1.png, generated_image2.png, ...
						generated_dir = "generated images"
						os.makedirs(generated_dir, exist_ok=True)

						# Find next index by scanning existing files
						existing = [f for f in os.listdir(generated_dir) if f.startswith("generated_image") and f.lower().endswith('.png')]
						max_idx = 0
						for fn in existing:
							# filename format: generated_image<digits>.png
							name = fn[len("generated_image"):-4]  # strip prefix and .png
							if name.isdigit():
								idx = int(name)
								if idx > max_idx:
									max_idx = idx
						next_idx = max_idx + 1
						output_path = os.path.join(generated_dir, f"generated_image{next_idx}.png")
						gen_img.save(output_path)
						# Convert to base64 for web display
						buffer = BytesIO()
						gen_img.save(buffer, "PNG")
						generated_image_base64 = base64.b64encode(buffer.getvalue()).decode()
					except Exception:
						# Fallback — directly base64-encode raw bytes (guard if None)
						generated_image_base64 = base64.b64encode(img_data or b"").decode()

		# If the client expects JSON (our React frontend sets Accept: application/json),
		# return a compact JSON payload the frontend expects. Otherwise render the HTML page.
		accept = request.headers.get("accept", "")
		if "application/json" in accept:
			return JSONResponse({
				"generated_text": generated_text,
				# Frontend expects `image_base64` key (single image); map accordingly
				"image_base64": generated_image_base64,
			})

		# --- Render back to HTML ---
		return templates.TemplateResponse(
			"index.html",
			{
				"request": request,
				"result": {
					#"idea": description,
					"uploaded_image_base64": uploaded_image_base64,
					"generated_image_base64": generated_image_base64,
					"style": style,
					"theme": theme,
					"color_mode": color_mode,
					"size": physical_attributes,
				},
				"error": None,
			},
		)

	except Exception as e:
		return templates.TemplateResponse(
			"index.html",
			{"request": request, "result": None, "error": str(e)},
		)
