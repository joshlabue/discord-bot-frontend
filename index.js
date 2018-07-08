var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var hbs = require('hbs');
app.set('view engine', 'hbs');
app.use(express.static('static'));

app.get('/', (req, res) => {
    res.render('app.hbs', {
        renderTime: new Date().getTime()
    });
});

var ready = false;

var selectedChannel;

io.on('connection', (socket) => {
    while(!ready);

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

    socket.emit('profile', {
        name: client.user.username,
        discriminator: client.user.discriminator,
        url: client.user.displayAvatarURL,
        servers: servers
    });

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
var config = config = require('./config.json');

client.on('ready', () => {
    ready = true;
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

client.on('message', (message) => {
    if(message.channel.id == selectedChannel) {
        io.emit('message', {
            authorName: message.author.username,
            authorDiscriminator: message.author.discriminator,
            messageContent: message.content
        });
    }
});

client.login(config.token);