const express = require('express');
const PORT = process.env.PORT || 5000;
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const router = require('./router');
const {addUser, removeUser, getUser, getUsersInRoom} = require('./users');

io.on('connection', socket => {
  console.log('we have a new connection!');

  socket.on('join', ({name, room}, callback) => {
    const {error, user} = addUser({id: socket.id, name, room});
    if (error) {
      console.log(error);
      return callback(error);
    }

    socket.emit('message', {
      user: 'admin',
      text: `${user.name}, welcome to the room ${user.room}`,
    });

    socket.broadcast
      .to(user.room)
      .emit('message', {user: 'admin', text: `${user.name} has joined!`});

    socket.join(user.room);

    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit('message', {user: user.name, text: message});
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit('message', {
        user: 'admin',
        text: `${user.name} has left`,
      });
    }
  });
});

app.use(router);

server.listen(PORT, () => console.log(`Server has started on port ${PORT}!`));
