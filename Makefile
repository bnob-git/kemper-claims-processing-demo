.PHONY: run-backend run-frontend run test-backend test-frontend test lint-backend lint-frontend lint build-backend build-frontend build

# --- Run ---
run-backend:
	cd backend && mvn spring-boot:run

run-frontend:
	cd frontend && npm start

run: ## Run both backend and frontend (use two terminals or background one)
	@echo "Start backend:  make run-backend"
	@echo "Start frontend: make run-frontend"

# --- Test ---
test-backend:
	cd backend && mvn clean test

test-frontend:
	cd frontend && npm test

test: test-backend test-frontend

# --- Lint ---
lint-backend:
	cd backend && mvn checkstyle:check

lint-frontend:
	cd frontend && npm run lint

lint: lint-backend lint-frontend

# --- Build ---
build-backend:
	cd backend && mvn clean package -DskipTests

build-frontend:
	cd frontend && npm run build

build: build-backend build-frontend

# --- E2E ---
e2e:
	cd frontend && npx playwright test

# --- Install ---
install-frontend:
	cd frontend && npm install

install: install-frontend
	@echo "Backend dependencies managed by Maven (auto-downloaded on build)"
