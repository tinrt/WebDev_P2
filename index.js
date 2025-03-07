const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const dbcmps369 = require('dbcmps369');

const app = express();
const db = new sqlite3.Database('./contacts.db');

app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'secret-key', resave: false, saveUninitialized: true }));

// Middleware to add db to req
app.use((req, res, next) => {
    req.db = db;
    next();
});

// Middleware to check if user is logged in
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

// Initialize database
const initializeDatabase = () => {
    db.run(`CREATE TABLE IF NOT EXISTS Users (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        FirstName TEXT,
        LastName TEXT,
        Username TEXT UNIQUE,
        Password TEXT
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS Contact (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        FirstName TEXT,
        LastName TEXT,
        PhoneNumber TEXT,
        Email TEXT,
        Street TEXT,
        City TEXT,
        State TEXT,
        Zip TEXT,
        Country TEXT,
        Contact_By_Email INTEGER,
        Contact_By_Phone INTEGER,
        Contact_By_Mail INTEGER
    )`);

    db.get("SELECT * FROM Users WHERE Username = ?", ['cmps369'], (err, row) => {
        if (!row) {
            bcrypt.hash('rcnj', 10, (err, hash) => {
                db.run("INSERT INTO Users (FirstName, LastName, Username, Password) VALUES (?, ?, ?, ?)",
                    ['Admin', 'User', 'cmps369', hash]);
            });
        }
    });
};

initializeDatabase();

// User authentication routes
const userRoutes = express.Router();

userRoutes.get('/login', (req, res) => {
    res.render('login');
});

userRoutes.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM Users WHERE Username = ?", [username], (err, user) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Internal Server Error");
        }
        if (!user || !bcrypt.compareSync(password, user.Password)) {
            return res.render('login', { error: 'Invalid username or password' });
        }
        req.session.user = user;
        res.redirect('/');
    });
});

userRoutes.get('/signup', (req, res) => {
    res.render('signup');
});

userRoutes.post('/signup', (req, res) => {
    const { firstName, lastName, username, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render('signup', { error: 'Passwords do not match' });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.render('signup', { error: 'Error encrypting password' });
        }

        db.run(
            "INSERT INTO Users (FirstName, LastName, Username, Password) VALUES (?, ?, ?, ?)",
            [firstName, lastName, username, hash],
            function (err) {
                if (err) {
                    return res.render('signup', { error: 'Username already exists' });
                }
                res.redirect('/login');
            }
        );
    });
});

userRoutes.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.use('/', userRoutes);

// Contact management routes
const contactRoutes = express.Router();

contactRoutes.get('/', (req, res) => {
    db.all("SELECT * FROM Contact", [], (err, contacts) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Internal Server Error");
        }
        res.render('index', { contacts: contacts || [], user: req.session.user });
    });
});

contactRoutes.get('/create', requireAuth, (req, res) => {
    res.render('create', { user: req.session.user });
});

contactRoutes.post('/create', requireAuth, (req, res) => {
    const { firstName, lastName, phoneNumber, email, street, city, state, zip, country, contactByEmail, contactByPhone, contactByMail } = req.body;
    const sql = `INSERT INTO Contact 
        (FirstName, LastName, PhoneNumber, Email, Street, City, State, Zip, Country, Contact_By_Email, Contact_By_Phone, Contact_By_Mail) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
        firstName, lastName, phoneNumber, email, street, city, state, zip, country, 
        contactByEmail ? 1 : 0, contactByPhone ? 1 : 0, contactByMail ? 1 : 0
    ];
    db.run(sql, params, function(err) {
        if (err) {
            console.error("Database Insert Error:", err);
            return res.status(500).send("Error adding contact.");
        }
        res.redirect('/');
    });
});

contactRoutes.get('/:id/delete', requireAuth, (req, res) => {
    res.render('delete', { contactId: req.params.id, user: req.session.user });
});

contactRoutes.post('/:id/delete', requireAuth, (req, res) => {
    db.run("DELETE FROM Contact WHERE ID = ?", [req.params.id], function(err) {
        if (err) {
            console.error("Database Delete Error:", err);
            return res.status(500).send("Error deleting contact.");
        }
        res.redirect('/');
    });
});

contactRoutes.get('/:id', (req, res) => {
    db.get("SELECT * FROM Contact WHERE ID = ?", [req.params.id], (err, contact) => {
        if (!contact) {
            return res.status(404).send("Contact not found.");
        }
        res.render('view', { contact, user: req.session.user });
    });
});

contactRoutes.get('/:id/edit', requireAuth, (req, res) => {
    db.get("SELECT * FROM Contact WHERE ID = ?", [req.params.id], (err, contact) => {
        if (err) {
            console.error("Database Fetch Error:", err);
            return res.status(500).send("Internal Server Error");
        }
        if (!contact) {
            return res.status(404).send("Contact not found.");
        }
        res.render('edit', { contact, user: req.session.user });
    });
});

contactRoutes.post('/:id/edit', requireAuth, (req, res) => {
    const { firstName, lastName, phoneNumber, email, street, city, state, zip, country } = req.body;

    const contactByEmail = req.body.contactByEmail ? 1 : 0;
    const contactByPhone = req.body.contactByPhone ? 1 : 0;
    const contactByMail = req.body.contactByMail ? 1 : 0;

    db.run(
        "UPDATE Contact SET FirstName=?, LastName=?, PhoneNumber=?, Email=?, Street=?, City=?, State=?, Zip=?, Country=?, Contact_By_Email=?, Contact_By_Phone=?, Contact_By_Mail=? WHERE ID=?",
        [firstName, lastName, phoneNumber, email, street, city, state, zip, country, contactByEmail, contactByPhone, contactByMail, req.params.id],
        function(err) {
            if (err) {
                console.error("Database Update Error:", err);
                return res.status(500).send("Error updating contact.");
            }
            res.redirect(`/${req.params.id}`);
        }
    );
});


app.use('/', contactRoutes);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
