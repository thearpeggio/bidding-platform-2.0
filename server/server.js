const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const enableWs = require("express-ws");
const assetsRouter = require("./assets-router");
const app = express();
const cors = require("cors");
const socketIo = require("socket.io");
const http = require("http");
const PREFIX = "/api";

// Express setup
app.use(bodyParser.json());
app.use(cors());
app.use(cookieParser());
app.use("/", express.static(path.join(__dirname, "public")));
app.use("/src", assetsRouter);

// Local state (in memory, will be reset at restart)
let auctions = [];
let bids = [];
let users = [];
let auctionId = 0;
let bidId = 0;
let userId = 0;
const validStatuses = ["pending", "accepting_bids", "sold", "no_sale"];

const server = http.createServer(app);

const io = socketIo(server);

// Websocket notifications
const wssClients = [];
const wsInstance = enableWs(app);
app.ws("/", (ws) => wssClients.push(ws));
const notifyWssByAuction = (auctionId) => {
  const auction = auctions.find((auction) => auction.id === auctionId);
  wssClients.forEach((ws) => ws.send(JSON.stringify(auction)));
};

io.on("connect", function (socket) {
  const getAuction = getAuctionData();
  // on("connect") event is only fired once when client connect
  // how is the state broadcasted after that? (like it is with the websocket using notifyWssByAuction in the API endpoints)
  //// Socket.io has a slightly different approach than WS ~ https://socket.io/docs/v3/broadcasting-events/
  socket.broadcast.emit("getAuction", getAuction);

  const getBid = getBidData();
  socket.broadcast.emit("getBids", getBid);
});

const getBidData = () => {
  try {
    return bids;
  } catch (error) {
    return error.message;
  }
};

const getAuctionData = () => {
  try {
    return auctions;
  } catch (error) { }
};

// CRUD for USERS
app.get(`${PREFIX}/users/me`, (req, res) => {
  const { userId } = req.cookies;
  const user = users.find((user) => user.id == userId);
  if (!user) {
    return res.json({ message: "User not found." });
  }
  res.json(user);
});

app.post(`${PREFIX}/login`, (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "`name` is required." });
  }
  let user = users.find((user) => user.name === name);
  if (!user) {
    user = { id: ++userId, name };
    users.push(user);
  }
  res.cookie("userId", user.id);
  res.json(user);
});

app.post(`${PREFIX}/logout`, (req, res) => {
  res.clearCookie("userId");
  res.json({ message: "Logged out." });
});

// CRUD for AUCTIONS
app.get(`${PREFIX}/auctions`, (req, res) => {
  res.json(auctions);
});

app.post(`${PREFIX}/auctions`, (req, res) => {
  let auction = req.body;
  if (auction.id) {
    return res.status(400).json({
      message: "`id` should not be provided, it will be auto-generated.",
    });
  }
  if (!auction.name) {
    return res.status(400).json({ message: "`name` is required." });
  }
  if (!auction.status) {
    auction.status = "pending";
  } else if (!validStatuses.includes(auction.status)) {
    return res.status(400).json({
      message:
        "`status` should be `pending`, `accepting_bids`, `sold`, or `no_sale`.",
    });
  }
  auction.id = ++auctionId;
  auctions.push(auction);
  notifyWssByAuction(auctionId);
  res.json(auction);
});

app.put(`${PREFIX}/auctions/:id`, (req, res) => {
  const auctionId = parseInt(req.params.id, 10);
  let updatedAuction = req.body;
  if (updatedAuction.id) {
    return res.status(400).json({ message: "`id` should not be updated." });
  }
  if (!validStatuses.includes(updatedAuction.status)) {
    return res.status(400).json({
      message:
        "`status` should be `pending`, `accepting_bids`, `sold`, or `no_sale`.",
    });
  }
  const auctionIndex = auctions.findIndex(
    (auction) => auction.id === auctionId
  );
  if (auctionIndex === -1) {
    return res.status(404).json({ message: "Auction not found." });
  }
  auctions[auctionIndex] = { ...auctions[auctionIndex], ...updatedAuction };
  notifyWssByAuction(auctionId);
  res.json(auctions[auctionIndex]);
});

// CRUD for BIDS
app.get(`${PREFIX}/bids`, (req, res) => {
  res.json(bids);
});

app.post(`${PREFIX}/bids`, (req, res) => {
  let bid = req.body;
  if (bid.id) {
    return res.status(400).json({
      message: "`id` should not be provided, it will be auto-generated.",
    });
  }
  const auction = auctions.find((auction) => auction.id === bid.auction_id);
  if (!auction) {
    return res.status(400).json({ message: "Invalid `auction_id`" });
  }
  if (bid.amount < 0 || bid.amount < auction.start_price) {
    return res.status(400).json({
      message:
        "Bid `amount` is less than 0 or less than auction `start_price`.",
    });
  }
  const existingBids = bids.filter(
    (existingBid) => existingBid.auction_id === bid.auction_id
  );
  const maxExistingBid = Math.max(...existingBids.map((bid) => bid.amount), 0);
  if (bid.amount <= maxExistingBid) {
    return res.status(400).json({
      message:
        "Bid `amount` is not higher than existing bids for this auction.",
    });
  }
  bid.id = ++bidId;
  auction.current_price = bid.amount;
  auction.high_bidder_id = bid.user_id;
  notifyWssByAuction(bid.auction_id);
  bids.push(bid);
  res.json(bid);
});

// Catch all
app.get("/*", (_req, res) => {
  console.log("hey", _req);
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const { PORT = 5000 } = process.env;
// Why change this? Isn't it causing issues to server `server` instead of express `app` ?
// No issues that I'm aware of (seems to be working fine). I used socket.io in server that's why I changed to server to 'server' instead of 'app' .
server.listen(PORT, () => {
  console.log(`  App running in port ${PORT}`);
  console.log();
  console.log(`  > Local: \x1b[36mhttp://localhost:\x1b[1m${PORT}/\x1b[0m`);
});
