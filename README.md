# Nyaradzo Funeral Assurance Policyholder Churn Prediction System

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Magunje/nyaradzo-churn-prediction)

Browser-based churn intelligence system built from the provided prompt, notebook, and funeral insurance dataset for Nyaradzo Funeral Assurance.

## What’s included

- `backend/`: FastAPI API, SQLite persistence, authentication, model training, seeding, dashboard metrics, CRUD, and churn prediction.
- `frontend/`: React + Tailwind admin dashboard with login, KPI dashboard, add/edit forms, records table, and prediction screens.
- `docs/mockups/`: lightweight SVG mock screenshots for login, dashboard, records, and prediction views.
- `backend/app/data/churn_model.pkl`: trained churn model generated from the supplied CSV using notebook-inspired training logic.

## Source files used

- `codex_prompt_policyholder_churn.txt`: drove the system requirements and deliverables.
- `funeral_insurance_policyholder_churn_5000(1).csv`: used to train the model and seed the prototype SQLite database.
- `policyholder_churn_colab_notebook.ipynb`: informed the preprocessing pipeline, candidate model comparison, and final training flow.

## Tech stack

- Frontend: React, React Router, Tailwind CSS, Vite
- Backend: FastAPI
- Database: SQLite
- ML: scikit-learn, pandas, joblib

## Backend setup

From the project root:

```powershell
cd backend
python -m pip install -r requirements.txt
python -m app.scripts.train_model
python -m app.scripts.seed_data
python -m uvicorn app.main:app --reload
```

API base URL: `http://127.0.0.1:8000`

Swagger docs: `http://127.0.0.1:8000/docs`

Default prototype login:

- Email: `admin@nyaradzo.co.zw`
- Password: `Nyaradzo@123`

## Frontend setup

Node.js is required to run the frontend build locally.

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend URL: `http://127.0.0.1:5173`

If the backend is running elsewhere, update `VITE_API_BASE_URL` in `frontend/.env`.

## Web deployment

The system is now deployed as a browser-based web application instead of a Windows desktop app. FastAPI serves both the API and the built React frontend from one service, so the deployed link keeps the same login, dashboard, CRUD, prediction, policy-number lookup, and PDF export behavior.

### Oracle Cloud Always Free

Oracle Cloud can host the full system on an Always Free Ubuntu VM with persistent VM storage. See [deploy/oracle/README.md](deploy/oracle/README.md) for the VM setup, networking rule, and one-command deployment script.

### Fly.io

Fly.io can host the full Dockerized web app with a 1 GB persistent volume for the SQLite database. This repository includes `fly.toml`, configured for the Johannesburg region and a public HTTPS app URL.

```powershell
fly auth login
fly launch --copy-config --no-deploy
fly volumes create churn_data --region jnb --size 1
fly deploy
```

Fly app URL:

```text
https://nyaradzo-churn-prediction.fly.dev
```

### Local production run

From the project root:

```powershell
cd frontend
npm install
npm run build
cd ..
cd backend
python -m pip install -r requirements.txt
python -m app.scripts.train_model
python -m app.scripts.seed_data
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Web app URL: `http://127.0.0.1:8000`

### Docker run

From the project root:

```powershell
docker build -t nyaradzo-churn-prediction .
docker run --name nyaradzo-churn-prediction -p 8000:8000 -v nyaradzo-churn-data:/data -e DATABASE_PATH=/data/nyaradzo_churn.db -e AUTO_SEED_POLICYHOLDERS=1 nyaradzo-churn-prediction
```

Docker URL: `http://127.0.0.1:8000`

### Permanent hosting

This repository includes `render.yaml` for a Render web service using the Dockerfile and a persistent disk at `/data`. After pushing the project to GitHub, create a Render Blueprint from the repository. The app will use `DATABASE_PATH=/data/nyaradzo_churn.db` and auto-seed the policyholder dataset if the persistent database is empty.

Render will create the permanent public URL after the Blueprint is deployed. If the service name is available, the URL will look like this:

```text
https://nyaradzo-churn-prediction.onrender.com
```

For a public deployment, change `DEFAULT_ADMIN_PASSWORD` in the hosting dashboard before sharing the link.

## Key backend scripts

- `python -m app.scripts.train_model`
  Trains the churn model from the provided CSV and writes `churn_model.pkl` plus `model_metadata.json`.

- `python -m app.scripts.seed_data`
  Creates the SQLite schema, creates the default admin, and seeds 5,000 policyholders with cached churn predictions.

## API routes

### Auth

- `POST /api/auth/login`
  Request: `{ "email": "...", "password": "..." }`
  Response: bearer token plus user profile.

### Dashboard

- `GET /api/dashboard/metrics`
  Returns KPI cards, region mix, plan mix, and recent predictions.

### Reference data

- `GET /api/reference-data`
  Returns dropdown options for gender, region, plan type, payment frequency, and more.

### Policyholders

- `GET /api/policyholders`
  Supports `page`, `page_size`, `search`, `region`, `plan_type`, `risk_band`, `sort_by`, `sort_dir`.

- `GET /api/policyholders/{id}`
  Returns one policyholder record with cached prediction fields.

- `POST /api/policyholders`
  Creates a record, derives model-only fields, and stores the first prediction result.

- `PUT /api/policyholders/{id}`
  Updates a record and refreshes the cached prediction.

- `DELETE /api/policyholders/{id}`
  Deletes a record.

- `POST /api/policyholders/{id}/predict`
  Re-runs churn prediction for a stored policyholder and returns the full result payload.

### Predictions

- `POST /api/predictions`
  Performs ad hoc prediction without saving a policyholder record.

### Model info

- `GET /api/model-info`
  Returns the selected model, evaluation summary, and top feature importances.

## Product highlights

- Login validation for invalid email and incorrect password.
- Dashboard KPI cards for total policyholders, active policies, high-risk customers, and retention rate.
- Add/edit policyholder forms using the required business fields from the prompt.
- Searchable, filterable, paginated records table with edit, delete, and predict actions.
- Prediction result screen with churn probability, risk badge, suggested retention action, and top risk factors.
- Reusable frontend components and a professional admin dashboard visual system.

## Verification completed in this environment

- Model trained successfully from the provided CSV.
- SQLite database seeded with 5,000 policyholders.
- FastAPI endpoints verified with a local test client:
  - login
  - dashboard metrics
  - paginated record listing
  - stored-record prediction
  - ad hoc prediction

## Notes

- The backend was fully implemented and verified here.
- Node.js was not installed in this environment, so the React frontend code was generated but not executed locally.
- The trained model selected in this run was `Logistic Regression` based on ROC AUC from the notebook-style evaluation pipeline.
