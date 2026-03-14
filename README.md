# 🌾 CropAI: Regional Predictive Agriculture ERP

**CropAI** is an advanced AI-driven Enterprise Resource Planning (ERP) system designed to transform traditional farming into **Climate-Smart Agriculture**. By combining real-time IoT telemetry with multi-modal Vision AI, the system doesn't just diagnose diseases—it predicts regional outbreaks before they happen.

---

## 🚀 Core Features

### 1. **Multi-Modal AI Diagnostics (Vision)**
Powered by the **Qwen3-VL 30B Vision** model, CropAI analyzes crop imagery to identify diseases with high precision. It provides immediate, actionable treatment steps, acting as a digital agricultural pathologist.

### 2. **Regional Predictive Intelligence (Proactive)**
Utilizing **DeepSeek V3.2**, the system analyzes real-time IoT data (Temperature, Humidity, Soil Moisture) to detect "Environmental Disease Signatures."
- **Risk Assessment:** The AI identifies if conditions favor specific pathogens (e.g., high humidity + moderate temp = Late Blight risk).
- **Regional Broadcast:** Upon detecting a high-risk environment, the system automatically broadcasts prevention alerts to all registered farmers within the same geographical location.

### 3. **Smart Farm ERP Dashboard**
- **Real-time Gauges:** Visualized telemetry from IoT sensors.
- **Personalized Insights:** Context-aware recommendations based on user-specific crops.
- **History Tracking:** A MongoDB-backed history of all AI detections and environmental logs.

---

## 🛠️ The Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3 |
| **Backend** | Node.js, Express.js |
| **Relational Data** | PostgreSQL (User Accounts, Profiles) |
| **Non-Relational Data**| MongoDB (IoT Telemetry, AI History) |
| **AI Models** | Featherless.ai (**Qwen3-VL** & **DeepSeek V3.2**) |
| **Security** | JWT (Stateless Auth), BcryptJS (Encryption) |

---

## 📦 Installation & Setup

### 1. Prerequisites
- **Node.js** (v20+)
- **PostgreSQL** (Port 5432)
- **MongoDB** (Local or Atlas)
- **Featherless.ai** API Key

### 2. Clone & Install
```bash
git clone [https://github.com/lamartine587/CropAI-ERP-Final.git](https://github.com/lamartine587/CropAI-ERP-Final.git)
cd CropAI-ERP-Final/Group_project/backend
npm install
```
### 3. Database Setup (PostgreSQL)
```bash
CREATE DATABASE crop_dp;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE profiles (
    user_id INTEGER REFERENCES users(id),
    full_name VARCHAR(255),
    location VARCHAR(255),
    crops TEXT,
    avatar_url TEXT
);

```

### 4. Environment Configuration

Create a `.env` file in the `backend` folder:

```env
PORT=5000
DATABASE_URL=postgres://user:password@localhost:5432/cropai_db
MONGO_URI=mongodb://localhost:27017/cropai_iot
JWT_SECRET=your_jwt_secret_key
FEATHERLESS_API_KEY=your_api_key

```

### 5. Run the Application

```bash
npm start

```

---

## 🛡️ DevOps & Project Standards

* **Clean Architecture:** Uses a hybrid SQL/NoSQL approach for scalability.
* **Strict Git-Ignore:** Excludes `node_modules` and sensitive `.env` files.
* **Error Resiliency:** Defensive AI parsing handles non-JSON outputs and timeouts.

---

## 👥 Contributors

* **Lamartine Kipkoech (Don)** - Full Stack Developer & AI Architect
* **Mary safari** - backend
* **Bildad Ochieng** -Frontend 
* **Brian Jean** -Frontend 
* **Hildah Kinya** -Designer

```


```
