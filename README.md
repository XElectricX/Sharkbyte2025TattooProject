# Tattoo Generator Project
This project consists of a React frontend and a Python (FastAPI) backend. <br>
# One-Time Setup
You only need to follow these steps the first time you set up the project. <br>
All commands are run from the project's root folder. <br>
# Set Up Backend (Python)
## 1. Create a Python virtual environment
python -m venv venv

## 2. Activate the virtual environment
### Windows:
.\venv\Scripts\activate <br>
### Mac/Linux:
source venv/bin/activate <br>

## 3. Install Python dependencies
(Make sure your (venv) is active first and that you are in the project folder with the Python code) <br>
cd project <br>
pip install -r requirements.txt <br>
# Set Up Frontend (React)
## 1. Move into the frontend directory
cd tattoo-generator <br>

## 2. Install Node.js dependencies
npm install <br>

# Start the FastAPI server
## 1: Start the backend (make sure to be in the project folder)
cd project <br>
uvicorn main:app --reload <br>
(Leave this terminal running. Your backend is now live at http://127.0.0.1:8000) <br>
## 2: Start the Frontend App
cd tattoo-generator <br>
npm run dev <br>
(Leave this terminal running. Your app will open in a browser at http://localhost:5173)
