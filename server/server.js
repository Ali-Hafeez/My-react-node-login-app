// server/server.js
require('dotenv').config(); // Load .env variables into process.env
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcrypt');
const sql = require('mssql');

const app = express();
const port = process.env.PORT || 3001; // Use port from .env or default
const saltRounds = 10;

// --- Database Configuration (Extracted from Connection String) ---
// It's cleaner to parse the string or use separate env vars if preferred
const dbConfig = {
    connectionString: "Server=tcp:my-sql-server-tecknuovo.database.windows.net,1433;Initial Catalog=mydatabase;Persist Security Info=False;User ID=azureuser;Password=-kL#~}d;px2Zjp2;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30",
    options: {
        encrypt: true, // Must be true for Azure SQL
        trustServerCertificate: false // Default is false, good practice
    }
};

// --- Middleware Setup ---

// 1. CORS (Cross-Origin Resource Sharing)
const corsOptions = {
    origin: process.env.CLIENT_URL, // Allow requests only from your React app's URL
    credentials: true // Crucial for sessions/cookies to work cross-origin
};
app.use(cors(corsOptions));

// 2. Body Parsers
app.use(express.json()); // Parse incoming JSON request bodies (for API calls)
app.use(express.urlencoded({ extended: true })); // Parse form data (less common for APIs)

// 3. Express Session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // Only save sessions if modified
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
        httpOnly: true, // Prevent client-side JS access to the cookie
        maxAge: 24 * 60 * 60 * 1000, // Cookie expiry time (e.g., 1 day)
        sameSite: 'lax' // Helps mitigate CSRF attacks ('strict' or 'lax')
    }
}));

// --- Database Connection Pool ---
let pool;
async function connectDb() {
    try {
        if (!pool) {
           pool = await sql.connect("Driver={ODBC Driver 18 for SQL Server};Server=tcp:my-sql-server-tecknuovo.database.windows.net,1433;Database=mydatabase;Uid=azureuser;Pwd=-kL#~}d;px2Zjp2;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;");
           console.log("Connected to Azure SQL Database");
        }
        return pool;
    } catch (err) {
        console.error('Database Connection Failed:', err);
        process.exit(1); // Exit if DB connection fails
    }
}
connectDb(); // Initialize connection on startup

// --- API Endpoints ---

// Example: Check Session Status
app.get('/api/check-session', (req, res) => {
    if (req.session.userId) {
        // User is logged in
        res.status(200).json({
            isLoggedIn: true,
            userId: req.session.userId,
            username: req.session.username
        });
    } else {
        // User is not logged in
        res.status(200).json({ isLoggedIn: false });
    }
});

// POST /api/signup
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    if (password.length < 6) { // Example: Add password complexity rule
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }


    try {
        const dbPool = await connectDb();
        const request = dbPool.request();

        // Check if username exists
        request.input('Username', sql.NVarChar, username);
        const userExistsResult = await request.query('SELECT UserID FROM Users WHERE Username = @Username');

        if (userExistsResult.recordset.length > 0) {
            return res.status(409).json({ error: 'Username already taken.' }); // 409 Conflict
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert user
        const insertRequest = dbPool.request(); // New request object
        insertRequest.input('Username', sql.NVarChar, username);
        insertRequest.input('PasswordHash', sql.NVarChar, hashedPassword);
        await insertRequest.query('INSERT INTO Users (Username, PasswordHash) VALUES (@Username, @PasswordHash)');

        console.log(`User ${username} signed up successfully.`);
        res.status(201).json({ message: 'Signup successful! Please log in.' }); // 201 Created

    } catch (err) {
        console.error('Signup Error:', err);
        res.status(500).json({ error: 'An internal server error occurred during signup.' }); // Generic error for client
    }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const dbPool = await connectDb();
        const request = dbPool.request();
        request.input('Username', sql.NVarChar, username);

        // Find user
        const result = await request.query('SELECT UserID, Username, PasswordHash FROM Users WHERE Username = @Username');

        if (result.recordset.length === 0) {
             return res.status(401).json({ error: 'Invalid credentials.' }); // 401 Unauthorized
        }

        const user = result.recordset[0];

        // Compare password hash
        const match = await bcrypt.compare(password, user.PasswordHash);

        if (match) {
            // Regenerate session to prevent fixation attacks
            req.session.regenerate(err => {
                if (err) {
                    console.error('Session regeneration error:', err);
                    return res.status(500).json({ error: 'Login failed during session setup.' });
                }
                // Store user info in session (DO NOT store password hash)
                req.session.userId = user.UserID;
                req.session.username = user.Username;
                console.log(`User ${user.Username} logged in. SessionID: ${req.sessionID}`);

                // Send success response with user info
                res.status(200).json({
                    message: 'Login successful!',
                    userId: user.UserID,
                    username: user.Username
                 });
            });
        } else {
             res.status(401).json({ error: 'Invalid credentials.' }); // Invalid password
        }
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'An internal server error occurred during login.' });
    }
});

// POST /api/logout (use POST to prevent CSRF via GET)
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout Error:', err);
            return res.status(500).json({ error: 'Could not log out, please try again.' });
        }
        // Important: Clear the cookie on the client side too!
        res.clearCookie('connect.sid'); // Use the default session cookie name, or your custom one
        res.status(200).json({ message: 'Logout successful.' });
    });
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});

// Graceful shutdown (optional but good practice)
process.on('SIGINT', async () => {
    console.log('Closing database connection pool...');
    if (pool) {
        await pool.close();
    }
    process.exit(0);
});