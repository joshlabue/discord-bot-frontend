var fs = require('fs');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var hbs = require('hbs');
app.set('view engine', 'hbs');
app.use(express.static('static'));
app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies


var config;
var configReady;
try {
    config = require('./config.json');
    configReady = true;
    console.log('Config ready.')
} 
catch(e) {
    configReady = false;
    config = {};
    console.log('Config not loaded. Will prompt user for setup.');
}

app.get('/', (req, res) => {
    if(!configReady) {
        res.render('setup.hbs');
    }
    else {
        res.render('app.hbs', {
            renderTime: new Date().getTime()
        });
    }
    
});

app.post('/setup', (req, res) => {
    console.log(req.body.token);
    config['token'] = req.body.token;
    fs.writeFileSync(__dirname + '/config.json', JSON.stringify(config));
    client.login(config.token);
    configReady = true;
    res.redirect('/');
});

var ready = false;

var selectedChannel;

io.on('connection', (socket) => {
    if(ready) socket.emit('profile', generateProfile());

    socket.on('selectChannel', (id) => {
        console.log('Watching id ' + id);
        selectedChannel = id;
    });

    socket.on('message', (message) => {
        client.channels.find('id', selectedChannel).send(message);
    });

    socket.on('requestPresence', () => {
        socket.emit('status', client.user.presence);
    });

    socket.on('status', (status) => {
        client.user.setStatus(status);
        socket.emit('status', client.user.presence);
    });

    socket.on('game', (game) => {
        client.user.setPresence({game: {name: game}});
        socket.emit('status', client.user.presence);
    });
});

http.listen(3000);

var discord = require('discord.js');
var client = new discord.Client();

client.on('ready', () => {
    ready = true;
    io.emit('profile', generateProfile());
    console.log('Logged in.');

    console.log(client.user.presence);
    for(var i = 0; i < client.guilds.array().length; i++) {
        textChannels = client.guilds.array()[i].channels.findAll('type', 'text');
        channels = [];
        for(var j = 0; j < textChannels.length; j++) {
            channels.push({
                id: textChannels[j].id,
                name: textChannels[j].name
            });
        }
        //console.log(client.guilds.array()[i].name + ' ' + client.guilds.array()[i].id + ' ' + JSON.stringify(channels));
    }
});

var generateProfile = () => {
    var servers = [];

    for(var i = 0; i < client.guilds.array().length; i++) {

        textChannels = client.guilds.array()[i].channels.findAll('type', 'text');
        channels = [];
        for(var j = 0; j < textChannels.length; j++) {
            channels.push({
                id: textChannels[j].id,
                name: textChannels[j].name
            });
        }

        var tempServer = {
            name: client.guilds.array()[i].name,
            id: client.guilds.array()[i].id,
            channels: channels
        };
        servers.push(tempServer);
    }

    return {
        name: client.user.username,
        discriminator: client.user.discriminator,
        url: client.user.displayAvatarURL,
        servers: servers
    };
};

client.on('message', (message) => {
    if(message.channel.id == selectedChannel) {
        io.emit('message', {
            authorName: message.author.username,
            authorDiscriminator: message.author.discriminator,
            messageContent: message.content
        });
    }
});

if(configReady) client.login(config.token);