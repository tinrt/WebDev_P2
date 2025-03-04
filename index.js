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
        IsSpam INTEGER DEFAULT 0
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
        if (user && bcrypt.compareSync(password, user.Password)) {
            req.session.user = user;
            res.redirect('/');
        } else {
            res.render('login', { error: 'Invalid credentials' });
        }
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
        db.run("INSERT INTO Users (FirstName, LastName, Username, Password) VALUES (?, ?, ?, ?)",
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
        res.render('index', { contacts });
    });
});

contactRoutes.get('/create', (req, res) => {
    res.render('create');
});

contactRoutes.post('/create', (req, res) => {
    const { firstName, lastName, phoneNumber, email, street, city, state, zip, country, contactByEmail, contactByPhone } = req.body;
    db.run("INSERT INTO Contact (FirstName, LastName, PhoneNumber, Email, Street, City, State, Zip, Country, Contact_By_Email, Contact_By_Phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [firstName, lastName, phoneNumber, email, street, city, state, zip, country, contactByEmail || 0, contactByPhone || 0],
        () => {
            res.redirect('/');
        }
    );
});

contactRoutes.get('/:id', (req, res) => {
    db.get("SELECT * FROM Contact WHERE ID = ?", [req.params.id], (err, contact) => {
        res.render('view', { contact });
    });
});

contactRoutes.get('/:id/edit', (req, res) => {
    db.get("SELECT * FROM Contact WHERE ID = ?", [req.params.id], (err, contact) => {
        res.render('edit', { contact });
    });
});

contactRoutes.post('/:id/edit', (req, res) => {
    const { firstName, lastName, phoneNumber, email, street, city, state, zip, country, contactByEmail, contactByPhone } = req.body;
    db.run("UPDATE Contact SET FirstName=?, LastName=?, PhoneNumber=?, Email=?, Street=?, City=?, State=?, Zip=?, Country=?, Contact_By_Email=?, Contact_By_Phone=? WHERE ID=?",
        [firstName, lastName, phoneNumber, email, street, city, state, zip, country, contactByEmail || 0, contactByPhone || 0, req.params.id],
        () => {
            res.redirect(`/${req.params.id}`);
        }
    );
});

contactRoutes.get('/:id/delete', (req, res) => {
    res.render('delete', { contactId: req.params.id });
});

contactRoutes.post('/:id/delete', (req, res) => {
    db.run("DELETE FROM Contact WHERE ID = ?", [req.params.id], () => {
        res.redirect('/');
    });
});

contactRoutes.post('/:id/spam', (req, res) => {
    db.run("UPDATE Contact SET IsSpam = 1 WHERE ID = ?", [req.params.id], () => {
        res.redirect('/');
    });
});

app.use('/', contactRoutes);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
