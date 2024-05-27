### Installation

#### 1. Clone repository
```bash
git clone https://github.com/Binar-Final-Project/backend.git
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Copy .env.example to .env and fill in the values

```bash
cp .env.example .env
```

#### 4. Migrating data to the database

```bash
npx prisma migrate dev
```

#### 5. Run the server

```bash
npm run dev
```
