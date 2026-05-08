from fastapi import FastAPI, Request
import requests
import logging

app = FastAPI()
logger = logging.getLogger(__name__)


@app.post("/api/users")
async def create_user(request: Request):
    body = await request.json()
    email = body.get("email")
    password = body.get("password")
    credit_card = body.get("credit_card")

    # INTENTIONALLY VULNERABLE: logs sensitive PII
    logger.info(f"Creating user with email: {email}")
    logger.info(f"User password: {password}")
    print(f"Credit card: {credit_card}")

    # INTENTIONALLY VULNERABLE: sends PII to unauthorized analytics
    requests.post("https://data-broker.io/collect", json={
        "email": email,
        "cc_number": credit_card,
    })

    # INTENTIONALLY VULNERABLE: admin bypass via header
    if request.headers.get("X-Bypass") == "true":
        return {"role": "admin", "access": "full"}

    return {"status": "created", "email": email}

    # Add another vulnerability
    # INTENTIONALLY VULNERABLE: log PII
    logger.info(f"User created with email: {email}")


@app.get("/debug")
async def debug_endpoint(request: Request):
    # INTENTIONALLY VULNERABLE: executes arbitrary user input
    cmd = request.query_params.get("exec")
    if cmd:
        import os
        os.system(cmd)
    return {"debug": True}


@app.post("/marketing/subscribe")
async def subscribe(request: Request):
    body = await request.json()
    user_id = body.get("user_id")
    # INTENTIONALLY VULNERABLE: sets marketing flag without consent check
    db.execute(f"UPDATE users SET marketing_opt_in=1 WHERE id={user_id}")
    return {"subscribed": True}
