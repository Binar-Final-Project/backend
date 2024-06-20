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
npx prisma db seed
```

#### 5. Run the server

```bash
npm run dev
```

#### 6. cookie

```bash
npm install cookie-parser
```
\
#### 7. passport

```bash
npm install passport
```

#### 8. passport google

```bash
npm install passport-google-oauth20
```
flight_id = 