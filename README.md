# Bidding Platform 2.0

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

# Requirements:

- Auctioneer can enter name and starting price for an item to auction
- Bidders can view current item and its current price
- Bidders can place bids on the item (assuming they are higher than current price)
- Whenever a bid is placed, it is immediately displayed to all bidders and auctioneer
- On outbid, bidder should be encouraged to bid again (e.g. if Bidder 2 clicks “Bid $300” Bidder 1 should
see some sort of “Bid again” message.)

- Only minor changes for Socket.io were implemented on the server. All basic CRUD/API information was already inplace but is now hooked up with the frontend react app

## Available Scripts

In the project directory (for fronted and server), you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

Note that backend server must be run in a separate terminal on: [http://localhost:5000](http://localhost:5000)

The page will reload when you make changes.\
You may also see any lint errors in the console.

