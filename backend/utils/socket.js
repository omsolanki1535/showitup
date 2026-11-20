// Holds the Socket.IO server so controllers can emit events without
// importing the server entry point (which would start the HTTP server).
let io = null;

export const setIO = (instance) => {
    io = instance;
};

export const getIO = () => io;
