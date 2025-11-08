from dotenv import load_dotenv
load_dotenv()




from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai_dep
from PIL import Image
import io
import os


from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO



app = FastAPI()

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
genai_dep.configure(api_key=os.getenv("GEMINI_API_KEY"))

@app.post("/generate-tattoo/")
async def generate_tattoo(
    photo: UploadFile = File(...),
    style: str = Form(...),
    theme: str = Form(...),
    color_mode: str = Form(...),
    size: str = Form(...)
):
    try:



#IMAGEN STUFF-------------------------
        client = genai.Client()
        image_bytes = await photo.read()
        image = Image.open(BytesIO(image_bytes))

        prompt = f"""
        You are a professional tattoo designer.
        USING ONLY THE IMAGE PROVIDED,Design a {color_mode} {style} tattoo with the theme "{theme}".
        It should be appropriate for a {size} placement on the provided body photo.
        Keep the original image intact — only overlay the tattoo realistically. YOU MAY ONLY USE THE IMAGE PROVIDED BY ME AS A BASE.
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash-image",#
            contents=[prompt, image],
        )

        description = ""
        image = None

        for part in response.parts:
            if part.text is not None:
                description += part.text
            elif part.inline_data is not None:
                image = part.as_image()

        if image:
            buffer = io.BytesIO()
            #image.save("generated_image.png", "PNG")  # ✅ safe form
            from PIL import Image as PILImage
            

            # Safely handle different image formats Gemini might return
            if hasattr(image, "save"):  # means it's a real PIL image
                image.save("generated_image.png")
            else:
                # handle raw bytes or inline data
                with open("generated_image.png", "wb") as f:
                    if hasattr(image, "read"):
                        f.write(image.read())
                    elif isinstance(image, bytes):
                        f.write(image)
                    elif hasattr(image, "tobytes"):
                        f.write(image.tobytes())
                    else:
                        raise TypeError(f"Unexpected image type: {type(image)}")

            buffer.seek(0)
            image_bytes = buffer.getvalue()
        else:
            image_bytes = None

        return {
            "idea": description,
            "style": style,
            "theme": theme,
            "color_mode": color_mode,
            "size": size,
            # optionally base64-encode for frontend:
            # "preview_image_base64": base64.b64encode(image_bytes).decode() if image_bytes else None,
        }


    except Exception as e:
        return {"error": str(e)}


#HTML ENDPOINT-------------------------
