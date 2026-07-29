# 🚀 JJCETD2P

> **D2P Lab Operations and Component Management System**
>
> A modern FastAPI-based Inventory and Laboratory Operations Management System developed for the Design to Product (D2P) Laboratory at **J.J. College of Engineering and Technology (JJCET)**.

![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?logo=postgresql)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-ORM-red)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-Academic-green)

---

# 📖 About

The **D2P Lab Operations and Component Management System (JJCETD2P)** is a centralized web application designed to digitize and automate the inventory and daily operations of the **Design to Product (D2P) Laboratory**.

The current laboratory workflow relies on manual registers for maintaining component inventory, issuing materials, tracking returns, and managing stock.

This project replaces the manual process with a secure, scalable, and modern digital platform.

This application is being developed as a **Capstone Project** for the Department of Computer Science and Engineering.

---

# 🏫 Institution

**J.J. College of Engineering and Technology (JJCET)**

📍 Ammapettai, Tiruchirappalli, Tamil Nadu, India

🌐 https://jjcet.ac.in/

---

# 🎯 Problem Statement

Current D2P laboratory management faces several challenges:

- Manual register maintenance
- Difficult inventory tracking
- No centralized database
- Delayed issue & return process
- Missing stock records
- Limited reporting
- No audit trail
- Poor inventory visibility

---

# 💡 Proposed Solution

Develop a secure web-based inventory management platform that provides:

- Digital Inventory Management
- Student Authentication
- Component Issue & Return
- Borrow Request Workflow
- Real-time Stock Monitoring
- Damage & Loss Tracking
- Reports & Analytics
- Role-Based Access Control
- Audit Logging
- Administrative Dashboard

---

# 👥 User Roles

- 👨‍🎓 Student
- 👨‍🏫 D2P In-Charge
- 👨‍💼 Management
- 👨‍💻 Administrator

---

# 🚀 Features

## Student

- Register & Login
- Search Components
- View Availability
- Request Components
- Borrow History

## D2P In-Charge

- Manage Components
- Manage Categories
- Manage Inventory
- Approve Requests
- Issue Components
- Receive Returns
- Damage Tracking
- Reports

## Management

- Dashboard
- Reports
- Analytics
- Inventory Statistics

## Administrator

- User Management
- Role Management
- System Configuration
- Audit Logs

---

# 🛠 Technology Stack

## Backend

- Python 3.12+
- FastAPI

## Database

- PostgreSQL

## ORM

- SQLAlchemy

## Validation

- Pydantic

## Authentication

- JWT Authentication

## Security

- Password Hashing
- Role-Based Access Control (RBAC)

## API Documentation

- Swagger UI
- OpenAPI

## Testing

- Pytest

## Deployment

- Docker
- Docker Compose

## Version Control

- Git
- GitHub

---

# 🏗 Architecture

```text
                Client (Browser / Postman)
                          │
                          ▼
                   FastAPI Router Layer
                          │
                          ▼
                  Business Service Layer
                          │
                          ▼
                  Repository / Data Layer
                          │
                          ▼
                 PostgreSQL Database
```

---

# 📂 Modules

- Authentication
- User Management
- Student Management
- Component Management
- Category Management
- Inventory Management
- Borrow Request Management
- Issue Management
- Return Management
- Damage Management
- Dashboard
- Reports
- Notifications
- Audit Logs

---

# 🗄 Database Tables

- Users
- Roles
- Students
- Components
- Categories
- Inventory
- BorrowRequests
- IssuedComponents
- Returns
- DamageRecords
- Notifications
- AuditLogs

---

# 🔒 Security Features

- JWT Authentication
- Password Hashing
- Role-Based Authorization
- Input Validation
- SQL Injection Protection
- Secure REST APIs
- Audit Logging

---

# 🎯 Objectives

- Digitize laboratory operations
- Improve inventory accuracy
- Reduce manual paperwork
- Provide real-time stock visibility
- Maintain audit history
- Improve accountability
- Generate reports
- Enhance laboratory efficiency

---

# 📈 Development Roadmap

- ✅ Core Business Logic
- ✅ REST API Development
- ✅ Layered Architecture
- ✅ SQLAlchemy ORM
- ✅ PostgreSQL Integration
- ✅ JWT Authentication
- ✅ RBAC Authorization
- ✅ Testing with Pytest
- ✅ Swagger Documentation
- ✅ Docker Deployment

---

# 🔮 Future Enhancements

- QR Code Integration
- RFID Support
- Barcode Scanner
- AI Component Recommendation
- AI Stock Prediction
- Mobile Application
- Email Notifications
- Multi-Lab Support

---

# 📊 Project Status

🚧 **Currently Under Development**

---

# 👨‍💻 Developer

**Ayyappan P**

Bachelor of Engineering (Computer Science and Engineering)

J.J. College of Engineering and Technology

Batch: **2024 – 2028**

---

# ⭐ Support

If you find this project useful, consider giving it a ⭐ on GitHub.

---

# 📄 License

This project is developed for **academic and educational purposes** as part of the Capstone Project at **J.J. College of Engineering and Technology (JJCET)**.