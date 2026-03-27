# InventoryScout

InventoryScout helps sourcing teams make better product decisions.

Instead of guessing which product to stock next, a team can save a product, check competing brands, run an AI review, and get a simple read on demand, risk, and next steps.

## What it does

- Save products you want to track
- Save competitor websites you want to watch
- Run a product review for a saved product
- Run a competitor review for a saved product
- Run competitor activity checks and see alerts
- Show confidence, source health, and next actions in one dashboard

## Who it is for

InventoryScout is built for:

- importers
- wholesalers
- distributors
- e-commerce teams
- sourcing teams that need faster product research

## The problem

Teams often do product research by hand.

That usually means:

- checking many product pages one by one
- comparing competitors in spreadsheets
- making decisions with old or incomplete information
- spending too much time before placing inventory bets

InventoryScout is meant to shorten that work.

## How the product works

1. Create an account
2. Add a product
3. Add competitors
4. Run product insights
5. Run competitor activity checks
6. Review the scores, risks, and recommendations

## Why TinyFish matters here

TinyFish is part of the core workflow.

It is used to visit pages, pull useful signals from them, and help turn those signals into the final product and competitor reports shown in the app.

## Project structure

- `frontend/` - the web app people use
- `backend/` - the API and scoring logic

## Run the project

### Prerequisites

1. Python 3.12
2. Node 22.19
3. NPM 11.11

- Clone this repo
```bash
git clone https://github.com/Danny10ison/inventoryscout.git
```
- create a virtual env
```bash
python3 -m venv .venv
```

- Backend setup
```bash
# install python requirements
pip install requirements.txt
```

- Run backend api
```bash
fastapi dev
```

- api docs
```
http://localhost:8000/docs
```
## Demo flow

1. Sign up
2. Add one product
3. Add two or three competitors
4. Run product insights
5. Run competitor activity checks
6. Open the intelligence pages and review the recommendations

## Vision

InventoryScout aims to become a daily decision tool for product sourcing teams.

The goal is simple: help teams decide what to source, what to avoid, and what competitors are doing without spending hours doing manual research.
