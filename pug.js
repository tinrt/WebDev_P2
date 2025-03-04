const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const dbcmps369 = require('dbcmps369');
const fs = require('fs');
const mkdirp = require('mkdirp');

const app = express();
const db = new sqlite3.Database('./contacts.db');

app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'secret-key', resave: false, saveUninitialized: true }));

// Ensure views directory exists
mkdirp.sync(path.join(__dirname, 'views'));

// Generate Pug templates
const templates = {
    'layout.pug': `
    doctype html
    html
        head
            title Contact List
            link(rel='stylesheet', href='https://cdn.jsdelivr.net/npm/water.css@2/out/water.css')
        body
            nav
                a(href='/') Home |
                if !user
                    a(href='/login') Login |
                    a(href='/signup') Signup
                else
                    a(href='/logout') Logout |
                    a(href='/create') Add Contact
            block content
    `,
    'index.pug': `
    extends layout
    block content
        h1 Contact List
        table
            thead
                tr
                    th Name
                    th Email
                    th Phone
                    th Actions
            tbody
                each contact in contacts
                    tr
                        td #{contact.FirstName} #{contact.LastName}
                        td #{contact.Email}
                        td #{contact.PhoneNumber}
                        td
                            a(href='/' + contact.ID) View |
                            a(href='/' + contact.ID + '/edit') Edit |
                            a(href='/' + contact.ID + '/delete') Delete |
                            form(method='post', action='/' + contact.ID + '/spam')
                                button(type='submit') Mark as Spam
    `,
    'login.pug': `
    extends layout
    block content
        h1 Login
        if error
            p.error #{error}
        form(method='post', action='/login')
            label Username:
            input(type='text', name='username', required)
            label Password:
            input(type='password', name='password', required)
            button(type='submit') Login
    `,
    'signup.pug': `
    extends layout
    block content
        h1 Signup
        if error
            p.error #{error}
        form(method='post', action='/signup')
            label First Name:
            input(type='text', name='firstName', required)
            label Last Name:
            input(type='text', name='lastName', required)
            label Username:
            input(type='text', name='username', required)
            label Password:
            input(type='password', name='password', required)
            label Confirm Password:
            input(type='password', name='confirmPassword', required)
            button(type='submit') Signup
    `,
    'create.pug': `
    extends layout
    block content
        h1 Add Contact
        form(method='post', action='/create')
            label First Name:
            input(type='text', name='firstName', required)
            label Last Name:
            input(type='text', name='lastName', required)
            label Phone:
            input(type='text', name='phoneNumber', required)
            label Email:
            input(type='email', name='email', required)
            button(type='submit') Add Contact
    `,
    'view.pug': `
    extends layout
    block content
        h1 Contact Details
        p Name: #{contact.FirstName} #{contact.LastName}
        p Email: #{contact.Email}
        p Phone: #{contact.PhoneNumber}
        a(href='/' + contact.ID + '/edit') Edit |
        a(href='/' + contact.ID + '/delete') Delete
    `,
    'edit.pug': `
    extends layout
    block content
        h1 Edit Contact
        form(method='post', action='/' + contact.ID + '/edit')
            label First Name:
            input(type='text', name='firstName', value=contact.FirstName, required)
            label Last Name:
            input(type='text', name='lastName', value=contact.LastName, required)
            label Phone:
            input(type='text', name='phoneNumber', value=contact.PhoneNumber, required)
            label Email:
            input(type='email', name='email', value=contact.Email, required)
            button(type='submit') Save Changes
    `,
    'delete.pug': `
    extends layout
    block content
        h1 Confirm Delete
        p Are you sure you want to delete this contact?
        form(method='post', action='/' + contactId + '/delete')
            button(type='submit') Delete
            a(href='/') Cancel
    `
};

// Write templates to files
for (const [filename, content] of Object.entries(templates)) {
    fs.writeFileSync(path.join(__dirname, 'views', filename), content);
}

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
