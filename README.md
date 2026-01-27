# cw-mentor

> **Note**: This is a fork of [gabbyburke/cw-mentor](https://github.com/gabbyburke/cw-mentor) maintained by GPS-Demos for demonstration purposes.

A child welfare case mentorship system with AI-powered analysis capabilities using **Gemini 2.5 Flash**.

## Overview

This project provides tools for analyzing child welfare case interactions, offering feedback and guidance to social workers based on best practices and Arkansas child welfare guidelines. The system uses Google's Gemini 2.5 Flash model with RAG (Retrieval-Augmented Generation) to ground responses in curriculum materials.

## Project Structure

- **`frontend/`** - React + TypeScript web interface
- **`backend/`** - Google Cloud Functions for various services
  - `analysis-function/` - Main analysis service with Gemini 2.5 Flash integration
  - `mentorship-function/` - Mentorship services with RAG
  - `simulation-function/` - Client simulation services
  - `rag/` - Retrieval-augmented generation components

## Features

- **Gemini 2.5 Flash** - Latest AI model for fast, high-quality responses
- Real-time streaming analysis with thinking mode support
- Citation tracking and grounding metadata from curriculum materials
- Interactive web interface for case analysis
- Support for supervisor and standard analysis displays
- RAG-powered responses grounded in training materials

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Google Cloud Project with Vertex AI enabled
- Vertex AI Search datastore (for curriculum materials)
- Vertex RAG Store corpus (for mentorship and simulation)

### Backend Setup

1. **Navigate to each backend function directory:**
   ```bash
   cd backend/analysis-function
   # or backend/mentorship-function
   # or backend/simulation-function
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   
   Set environment variables in your shell or create a `.env` file:
   ```bash
   # Option 1: Export in your shell
   export GOOGLE_CLOUD_PROJECT=your-gcp-project-id
   export VERTEX_AI_DATASTORE_ID=projects/your-project/locations/global/collections/default_collection/dataStores/your-datastore-id
   
   # Option 2: Create a .env file (see backend/.env.example for template)
   # Note: .env files are gitignored for security
   ```
   
   Required variables:
   - `GOOGLE_CLOUD_PROJECT` - Your GCP project ID
   - `VERTEX_AI_DATASTORE_ID` - Datastore ID for curriculum materials (analysis function)
   - `VERTEX_RAG_CORPUS_ID` - RAG corpus for mentorship (mentorship function)
   - `VERTEX_RAG_CORPUS_ID_SCENARIOS` - RAG corpus for simulations (simulation function)
   - `DEBUG_STREAMING` - Set to "true" for verbose logging (optional)

4. **Test locally:**
   ```bash
   functions-framework --target=social_work_ai --debug
   # or mentorship_ai, simulation_ai depending on function
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   
   Create a `.env` file in the frontend directory:
   ```bash
   # See frontend/.env.example for template
   # Create frontend/.env with your actual URLs
   ```
   
   Required variables:
   - `VITE_CLOUD_FUNCTION_URL` - URL of deployed analysis function
   - `VITE_MENTORSHIP_FUNCTION_URL` - URL of deployed mentorship function
   - `VITE_SIMULATION_FUNCTION_URL` - URL of deployed simulation function
   
   Example `.env` file:
   ```
   VITE_CLOUD_FUNCTION_URL=https://us-central1-your-project.cloudfunctions.net/analysis-function
   VITE_MENTORSHIP_FUNCTION_URL=https://your-mentorship-service.run.app
   VITE_SIMULATION_FUNCTION_URL=https://your-simulation-service.run.app
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

## Deployment

### Deploy Backend Functions

```bash
# Deploy analysis function
cd backend/analysis-function
gcloud functions deploy analysis-function \
  --runtime python39 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point social_work_ai \
  --set-env-vars GOOGLE_CLOUD_PROJECT=your-project-id

# Repeat for mentorship-function and simulation-function
```

### Deploy Frontend

```bash
cd frontend
npm run build
firebase deploy
```

## Technology Stack

- **AI Model**: Gemini 2.5 Flash
- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Python, Google Cloud Functions, Flask
- **AI Services**: Vertex AI, Vertex AI Search, Vertex RAG Store
- **Deployment**: Google Cloud Functions, Firebase Hosting

## Model Information

This project uses **Gemini 2.5 Flash** across all three backend functions:
- **Analysis Function**: Uses thinking mode with 24,576 token budget for deep analysis
- **Mentorship Function**: Provides curriculum-grounded mentorship advice
- **Simulation Function**: Powers realistic client role-play scenarios

## Original Project

For the original project and its documentation, please visit: [gabbyburke/cw-mentor](https://github.com/gabbyburke/cw-mentor)
