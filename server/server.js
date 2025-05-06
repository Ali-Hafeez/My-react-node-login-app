require('dotenv').config(); // Load .env variables into process.env
const express = require('express');
const session = require('express-session'); // For session management
const cors = require('cors'); // For enabling Cross-Origin Resource Sharing
const bcrypt = require('bcrypt'); // For hashing passwords
const sql = require('mssql'); // The driver for MS SQL Server / Azure SQL

const app = express(); // Create an instance of the Express application
const port = process.env.PORT || 3001; // Use port from .env or default to 3001
const saltRounds = 10; // Cost factor for bcrypt hashing (higher is slower but more secure)
const rateLimit = require('express-rate-limit'); // Protect against brute force
const helmet = require('helmet'); // Secure headers

// --- Database Configuration (Extracted from Connection String) ---
// It's cleaner to parse the string or use separate env vars if preferred
const dbConfig = {
    connectionString: process.env.DATABASE_CONNECTION_STRING, // Get string from .env
    options: {
        encrypt: true, // Required for Azure SQL
        trustServerCertificate: false // Recommended for security
    }
};

// --- Database Connection Pool ---
let pool; // Variable to hold the connection pool instance
// async function connectDb() {
//     try {
//         // Check if the pool already exists to avoid creating multiple pools
//         if (!pool) {
//            console.log("Attempting to connect to Azure SQL...");
//            // Use the dbConfig object with connectionString
//            pool = await sql.connect(dbConfig);
//            // Or directly use the connection string if dbConfig isn't needed elsewhere:
//            // pool = await sql.connect(process.env.DATABASE_CONNECTION_STRING);
//            console.log("Successfully connected to Azure SQL Database via connection pool.");
//         }
//         return pool; // Return the established pool
//     } catch (err) {
//         console.error('Database Connection Pool Failed:', err.message);
//         // Log the error details for debugging
//         console.error('Error Code:', err.code);
//         console.error('Server Name:', err.serverName); // If available in error
//         // Exit the application if the database connection fails on startup
//         // This prevents the server from running in a broken state.
//         process.exit(1);
//     }
// }
async function connectDb() {
    try {
        if (!pool) {
           console.log("Attempting to connect to Azure SQL...");
           // --- CHANGE THIS ---
           // Directly use the connection string loaded from .env
           pool = await sql.connect(process.env.DATABASE_CONNECTION_STRING);
           // --- END CHANGE ---
           console.log("Successfully connected to Azure SQL Database via connection pool.");
        }
        return pool;
    } catch (err) {
        console.error('Database Connection Pool Failed:', err.message); // Log message
        console.error('Stack Trace:', err.stack); // Log full stack
        process.exit(1);
    }
}
connectDb(); // Initialize the connection pool when the application starts
// --- Security Middleware Additions ---

// Set various secure HTTP headers
app.use(helmet());

// Limit repeated requests to public APIs and auth endpoints (basic protection)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

// --- Middleware Setup ---
// --- Middleware Setup ---

// 1. CORS (Cross-Origin Resource Sharing)
const corsOptions = {
    origin: process.env.CLIENT_URL, // Allow requests *only* from your frontend's URL (e.g., http://localhost:3000)
    credentials: true // IMPORTANT: Allows cookies (like session cookies) to be sent cross-origin
};
app.use(cors(corsOptions));

// 2. Body Parsers
app.use(express.json()); // Parses incoming requests with JSON payloads (common for APIs) -> req.body
app.use(express.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads (from HTML forms, less common for modern APIs) -> req.body

// 3. Express Session
app.use(session({
    secret: process.env.SESSION_SECRET, // A long, random, secret string used to sign the session ID cookie. Keep this VERY secure!
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies (HTTPS only) in production
        httpOnly: true, // Crucial! Prevents client-side JavaScript from accessing the cookie, mitigating XSS attacks.
        maxAge: 24 * 60 * 60 * 1000, // Cookie expiry time in milliseconds (e.g., 1 day)
        sameSite: 'lax' // Protects against Cross-Site Request Forgery (CSRF). 'lax' is a good default. 'strict' is more secure but can break some cross-site navigation.
    }
    // Consider adding a session store for production (e.g., connect-redis, connect-mongo)
    // instead of the default MemoryStore which is not suitable for production.
}));


// --- API Endpoints ---

// Endpoint for frontend to check if user is already logged in (e.g., on page load)
app.get('/api/check-session', (req, res) => {
    // The express-session middleware automatically loads the session based on the cookie
    if (req.session && req.session.userId) {
        // User has an active session
        res.status(200).json({
            isLoggedIn: true,
            userId: req.session.userId,
            username: req.session.username // Send back stored session data
        });
    } else {
        // No valid session found (no cookie, invalid cookie, or session expired)
        res.status(200).json({ isLoggedIn: false }); // Send 200 OK, just indicating not logged in
    }
});

// POST /api/signup
// Endpoint for user signup
app.post('/api/signup', async (req, res) => {
    // 1. Extract data from request body
    const { username, password } = req.body; // Assuming email isn't required for signup here

    // 2. Basic Input Validation
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    if (password.length < 6) { // Example validation rule
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    // Add more validation: username format, allowed characters etc.

    try {
        // 3. Get Database Connection Pool
        const dbPool = await connectDb(); // Reuse the pool

        // 4. Check if Username Already Exists
        const checkUserRequest = dbPool.request();
        // Use Parameterized Query to prevent SQL Injection!
        checkUserRequest.input('Username', sql.NVarChar, username);
        const userExistsResult = await checkUserRequest.query('SELECT UserID FROM Users WHERE Username = @Username');

        if (userExistsResult.recordset.length > 0) {
            // Username taken - send a 409 Conflict status
            return res.status(409).json({ error: 'Username already taken.' });
        }

        // 5. Hash the Password
        // await is crucial here as bcrypt.hash is asynchronous
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 6. Insert New User into Database
        const insertRequest = dbPool.request(); // Use a new request object
        // Parameterized query again!
        insertRequest.input('Username', sql.NVarChar, username);
        insertRequest.input('PasswordHash', sql.NVarChar, hashedPassword);
        // Add Email field if your table includes it and you collect it at signup
        // insertRequest.input('Email', sql.NVarChar, email);
        await insertRequest.query('INSERT INTO Users (Username, PasswordHash) VALUES (@Username, @PasswordHash)');
        // If adding email: 'INSERT INTO Users (Username, Email, PasswordHash) VALUES (@Username, @Email, @PasswordHash)'

        console.log(`User ${username} signed up successfully.`);
        // 7. Send Success Response
        res.status(201).json({ message: 'Signup successful! Please log in.' }); // 201 Created is appropriate

    } catch (err) {
        // 8. Handle Errors
        console.error('Signup Error:', err);
        // Send a generic error message to the client for security
        res.status(500).json({ error: 'An internal server error occurred during signup.' });
    }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
    // 1. Extract credentials
    const { username, password } = req.body;

    // 2. Validate input
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        // 3. Get Database Pool
        const dbPool = await connectDb();
        const request = dbPool.request();

        // 4. Find User by Username (Parameterized Query)
        request.input('Username', sql.NVarChar, username);
        const result = await request.query('SELECT UserID, Username, PasswordHash FROM Users WHERE Username = @Username');

        // 5. Check if User Exists
        if (result.recordset.length === 0) {
            // User not found - DO NOT say "User not found", use a generic message
            return res.status(401).json({ error: 'Invalid credentials.' }); // 401 Unauthorized
        }

        const user = result.recordset[0]; // Get the user data from the result

        // 6. Compare Provided Password with Stored Hash
        // bcrypt.compare handles comparing the plain text password with the hash
        const match = await bcrypt.compare(password, user.PasswordHash);

        if (match) {
            // 7. Passwords Match - Regenerate Session & Store User Info
            req.session.regenerate(err => { // Regenerate session to prevent session fixation attacks
                if (err) {
                    console.error('Session regeneration error:', err);
                    return res.status(500).json({ error: 'Login failed during session setup.' });
                }

                // Store essential, non-sensitive user info in the session
                req.session.userId = user.UserID;
                req.session.username = user.Username;
                // **DO NOT store password hash or other sensitive data in the session!**

                console.log(`User ${user.Username} logged in. SessionID: ${req.sessionID}`);

                // 8. Send Success Response (including user info is helpful for frontend)
                res.status(200).json({
                    message: 'Login successful!',
                    userId: user.UserID,
                    username: user.Username // Send back basic info
                 });
            });
        } else {
            // 9. Passwords Don't Match
            // Use the same generic message as "user not found" to prevent username enumeration
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
    } catch (err) {
        // 10. Handle Errors
        console.error('Login Error:', err);
        res.status(500).json({ error: 'An internal server error occurred during login.' });
    }
});

// POST /api/logout (use POST to prevent CSRF via GET)
// Use POST for logout to prevent CSRF attacks that could trigger logout via a simple GET request (e.g., from an image tag)
app.post('/api/logout', (req, res) => {
    // Check if a session exists before trying to destroy
    if (req.session) {
        req.session.destroy(err => { // Destroys the session data on the server
            if (err) {
                console.error('Logout Error:', err);
                return res.status(500).json({ error: 'Could not log out, please try again.' });
            }
            // Crucially, also clear the session cookie from the browser
            // The default cookie name is 'connect.sid' unless configured otherwise in session options
            res.clearCookie('connect.sid'); // Adjust name if you customized it
            console.log('User logged out successfully.');
            res.status(200).json({ message: 'Logout successful.' });
        });
    } else {
        // No session existed anyway
        res.status(200).json({ message: 'No active session to log out from.' });
    }
});

app.get('/', (req, res) => {
    res.send('API is running.');
  });

// --- Start Server ---
app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});

// Graceful shutdown: Close the database pool when the app exits
process.on('SIGINT', async () => {
    console.log('SIGINT signal received: Closing database connection pool...');
    if (pool) {
        try {
            await pool.close();
            console.log('Database connection pool closed.');
        } catch (err) {
            console.error('Error closing database pool:', err);
        }
    }
    process.exit(0); // Exit cleanly
});