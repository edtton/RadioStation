var express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/', { useNewUrlParser: true, useUnifiedTopology: true });
const app = express();
const Schema = mongoose.Schema;
const bodyParser = require('body-parser');
// const cors = require('cors');
// app.use(cors());

// Use express-session middleware
app.use(session({
    secret: '74cb55fca7f26c37c0feb8321aedc64e5dd8146e648f2b288c7423871f16b68f',
    resave: false,
    saveUninitialized: true,
}));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const userSchema = new Schema({
    username: String,
    password: String,
    firstName: String,
    email: String,
    preferences: [{
        type: Schema.Types.ObjectId,
        ref: 'Song',
    }],
});

const songSchema = new Schema({
    name: String,
    artist: String,
    album: String,
    duration: Number
});

const DJSchema = new Schema({
    name: String,
});

// const preferencesSchema = new Schema({
//     user: {
//         type: Schema.Types.ObjectId,
//         ref: 'User',
//         unique: true,
//     },
//     preferredSongs: [{
//         type: Schema.Types.ObjectId,
//         ref: 'Song',
//     }],
// });

// create user model
const User = mongoose.model('User', userSchema);
const Song = mongoose.model('Song', songSchema);
const DJ = mongoose.model('DJ', DJSchema);
// const Preferences = mongoose.model('Preferences', preferencesSchema);

// async function updateUsers() {
//     try {
//         // Find all users without the 'preferences' attribute
//         const usersWithoutPreferences = await User.find({ preferences: { $exists: false } }).exec();

//         // Create a preferences document for each user and update the user
//         for (const user of usersWithoutPreferences) {
//             const preferences = new Preferences({ user: user._id });
//             await preferences.save();

//             // Update the user with the newly created preferences document
//             await User.updateOne({ _id: user._id }, { $set: { preferences: preferences._id } });
//         }

//         console.log('Users updated successfully.');
//     }
//     catch (error) {
//         console.error('Error updating users:', error);
//     }
// }


// updateUsers();

async function updateExistingUsers() {
    try {
        const users = await User.find();

        for (const user of users) {
            // If user.preferences is not an array, convert it to an array
            if (!Array.isArray(user.preferences)) {
                user.preferences = [user.preferences];
            }

            await user.save();
        }

        console.log('Existing users updated successfully.');
    } 
    catch (error) {
        console.error('Error updating existing users:', error);
    }
}

updateExistingUsers();

// app.post('/register', async (req, res) => {
//     const { username, password, firstName, email } = req.body;

//     try {
//         const user = new User({ username, password, firstName, email });
//         await user.save();

//         // Create a corresponding preferences document
//         const preferences = new Preferences({ user: user._id });
//         await preferences.save();

//         res.json({ message: 'User registered successfully.' });
//     }
//     catch (error) {
//         console.error('Error registering user:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

app.get('/home', function (req, res) {
    // Check if the user is logged in before rendering the home page
    if (req.session.username) {
        res.render('pages/home', { username: req.session.username });
    }
    else {
        res.redirect('/login');
    }
});

app.get('/profile', function (req, res) {
    // Check if the user is logged in before rendering the profile page
    if (req.session.username) {
        res.render('pages/profile', { username: req.session.username });
    }
    else {
        res.redirect('/login');
    }
});

app.get('/settings', function (req, res) {
    res.render('pages/settings');
});


app.get('/edit', function (req, res) {
    if (req.session.currentSongId) {
        res.render('pages/edit', { songId: req.session.currentSongId });
    }
});

// Login page route
app.get('/login', function (req, res) {
    res.render('pages/login', { message: '' });
});

// Login post route
app.post('/login', function (req, res) {
    const { username, password } = req.body;

    User.findOne({ username: username, password: password }).exec()
        .then(user => {
            if (user) {
                // Store username in the session
                req.session.username = username;
                res.redirect('/home');
            }
            else {
                res.render('pages/login', { message: 'Login failed. Please try again.' });
            }
        })
        .catch(err => {
            console.error(err);
            res.redirect('/login');
        });
});

// Add this route to your server code
app.get('/logout', function (req, res) {
    // Clear the session
    req.session.destroy(function (err) {
        if (err) {
            console.error(err);
        }
        // Redirect to the login page after clearing the session
        res.redirect('/login');
    });
});


app.get('/search', async (req, res) => {
    const searchTerm = req.query.term;

    if (!searchTerm) {
        return res.status(400).json({ error: 'Please provide a search term' });
    }

    try {
        const result = await Song.findOne({ name: new RegExp(searchTerm, 'i') });

        if (result) {
            res.json(result);
        }
        else {
            res.json({ message: 'Song not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// app.get('/getRandomSong', async (req, res) => {
//     try {
//         const count = await Song.countDocuments();
//         const randomIndex = Math.floor(Math.random() * count);

//         const randomSong = await Song.findOne().skip(randomIndex);

//         res.json(randomSong);
//     }
//     catch (error) {
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

app.get('/getRandomSong', async (req, res) => {
    try {
        const result = await Song.aggregate([{ $sample: { size: 1 } }]);
        const randomSong = result[0];

        // Include the song ID in the session
        req.session.currentSongId = randomSong._id;

        // Include the song details in the response
        res.json({
            name: randomSong.name,
            artist: randomSong.artist,
            album: randomSong.album || '',
            _id: randomSong._id, // Include the song ID
        });
    }
    catch (error) {
        console.error('Error fetching random song:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.get('/getAllSongs', async (req, res) => {
    try {
        const songs = await Song.find();
        // console.log('Songs:', songs); // Add this line for logging
        res.json(songs);
    }
    catch (error) {
        console.error('Error fetching songs:', error); // Add this line for logging
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/getUserPreferences', async (req, res) => {
    try {
        // Get the user's preferences based on the session
        const username = req.session.username;
        const user = await User.findOne({ username }).exec();

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Fetch the user's preferences directly from the user document
        const preferences = user.preferences;

        if (preferences && preferences.length > 0) {
            // If preferences exist, you may want to populate the song details
            // using a separate query if the song details are in a separate 'Song' collection
            // Replace 'Song' with the actual model name if different
            const populatedPreferences = await Song.find({ _id: { $in: preferences } }).exec();
            res.json(populatedPreferences);
        } else {
            res.json([]); // Return an empty array if no preferences found
        }
    } catch (error) {
        console.error('Error fetching user preferences:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



app.get('/getAllDJs', async (req, res) => {
    try {
        const djs = await DJ.find();
        // console.log('Songs:', songs); // Add this line for logging
        res.json(djs);
    }
    catch (error) {
        console.error('Error fetching DJs:', error); // Add this line for logging
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/getRandomDJ', async (req, res) => {
    try {
        const count = await DJ.countDocuments();
        const randomIndex = Math.floor(Math.random() * count);

        const randomDJ = await DJ.findOne().skip(randomIndex);

        res.json({ name: randomDJ.name }); // Adjust the response format
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/changePassword', async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    // Check if the old password matches the user's current password (you may need to modify this based on your authentication logic)
    const user = await User.findOne({ username: req.session.username, password: oldPassword }).exec();

    if (user) {
        // Update the user's password
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully.' });
    }
    else {
        res.status(401).json({ message: 'Incorrect old password.' });
    }
});

// Add this route to your server code
app.post('/addPreferredSong', async (req, res) => {
    try {
        const username = req.session.username;
        const user = await User.findOne({ username }).exec();

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const songId = req.body.songId;
        console.log('Received request body:', req.body.songId);

        if (user.preferences.includes(songId)) {
            return res.status(400).json({ message: 'Song is already in preferences.' });
        }
        else {
            user.preferences.push(songId);
        }
        await user.save();

        res.json({ message: 'Song added to preferences.' });
    }
    catch (error) {
        console.error('Error adding song to preferences:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/removePreferredSong', async (req, res) => {
    try {
        const username = req.session.username;
        const user = await User.findOne({ username }).exec();

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const songId = req.body.songId;

        // Check if the song is in the user's preferences
        const songIndex = user.preferences.indexOf(songId);
        if (songIndex !== -1) {
            // Remove the song from preferences
            user.preferences.splice(songIndex, 1);
            await user.save();

            res.json({ message: 'Song removed from preferences.' });
        } 
        else {
            res.status(400).json({ message: 'Song is not in preferences.' });
        }
    } 
    catch (error) {
        console.error('Error removing song from preferences:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(8080);
console.log('Server listening on port 8080');

