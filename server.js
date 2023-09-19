const express = require("express");
require('dotenv').config()
const app = express();

app.use(express.json());

app.listen(4000, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});