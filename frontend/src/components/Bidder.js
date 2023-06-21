import { useEffect, useState } from "react";
import {
  Card,
  Button,
  Form,
  Modal,
  Container,
  Alert,
  Spinner,
} from "react-bootstrap";
import "./style.css";
import { Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import socketIo from "socket.io-client";
import { FaArrowLeft } from "react-icons/fa";
import api from "../api";

const ENDPOINT = "http://localhost:5000";
let socket;

const Bidder = () => {
  const [auctions, setAuctions] = useState([]);
  const [bidderName, setBidderName] = useState("");
  const [showBidderModal, setShowBidderModal] = useState(false);
  const [bidders, setBidders] = useState([]);
  const [bidAmount, setBidAmount] = useState();
  // This is not used?
  const [userType, setUserType] = useState();
  const [showValidation, setShowValidation] = useState(false);
  const [bidStatus, setBidStatus] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showWonItemToast, setShowWonItemToast] = useState(false);
  const [showBidAgainToast, setShowBidAgainToast] = useState(false);
  const [message, setMessage] = useState();

  // A good practive is to name effects functions
  useEffect(() => {
    // An optimization would be to raise this socket and associated state/logic in Home.jsx to avoid duplication
    socket = socketIo(ENDPOINT, { transports: ["websocket"] });
    let auctionData;
    socket.on("getAuction", (data) => {
      setAuctions(data);
      auctionData = data;
      if (bidders.length === 0) {
        setBidAmount(
          // Isn't this already an integer?
          data.length !== 0 && parseInt(data[data.length - 1].price) + 100
        );
      }
    });
    socket.on("getBids", (data) => {
      //This should be better named setBids
      setBidders(data);
      if (data.length !== 0) {
        setBidAmount(
          // Store data[data.length - 1] in a var for readbility
          // Why use a var for auctionData it seems to need complex sync and precedence between getBids and getAuction messages?
          // Probably simpler to use `auctions` state directly rather than scope var auctionData
          data[data.length - 1].auction_id ===
            auctionData[auctionData.length - 1].id
            ? // Those are already numbers, no need to parse
              parseInt(data[data.length - 1].amount) + 100
            : parseInt(auctionData[auctionData.length - 1].price) + 100
        );
      }
    });
    // This should only run once, this will become very slow and at some point stop working
    // Also, adding this dep causes the websocket to reconnect a new instance each time, which is what makes it to work, effectively polling for new data (instead of server-initiated push, see server.js)
  }, [bidStatus]);

  useEffect(() => {
    // What is showWonItemToast used for? this logic is pretty hard to read/understand
    // it seems like showWonItemToast determine that the tost UI is shown, but when toast is displayed, it actually goes away after 3s by itself, leaving `showWonItemToast` to true?
    if (
      auctions.length > 0 &&
      // It could be nice to have the status strings in some global constant
      auctions[auctions.length - 1].status === "sold" &&
      bidderName === bidders[bidders.length - 1]?.name &&
      !showWonItemToast
    ) {
      setShowWonItemToast(true);
      toast.success("Congratulations! You won this item!");
    } else if (
      showWonItemToast &&
      (auctions.length === 0 ||
        auctions[auctions.length - 1].status !== "sold" ||
        bidderName !== bidders[bidders.length - 1]?.name)
    ) {
      setShowWonItemToast(false);
    }
  }, [auctions, bidders, bidderName, showWonItemToast]);

  useEffect(() => {
    if (
      auctions.length > 0 &&
      auctions[auctions.length - 1].status === "sold" &&
      bidders[bidders.length - 1]?.name !== bidderName &&
      !showBidAgainToast
    ) {
      setShowBidAgainToast(true);

      toast.warning("This item is sold!");
    } else if (
      showBidAgainToast &&
      (auctions.length === 0 ||
        auctions[auctions.length - 1].status === "pending" ||
        bidders[bidders.length - 1]?.name === bidderName)
    ) {
      setShowBidAgainToast(false);
    }
  }, [auctions, bidders, bidderName, showBidAgainToast]);

  useEffect(() => {
    let hasOutbid = false;

    // IIUC that effect logic can be written more simply as follows?
    // const auction = auctions[auctions.length - 1]
    // const highbid = bidders.find(a => a.auction_id === auction?.id)
    // const outbid = auction.status === 'pending' && highbid && highbid.name !== bidderName

    if (
      bidders.filter(
        (data) => data.auction_id === auctions[auctions.length - 1]?.id
      ).length !== 0 &&
      auctions[auctions.length - 1]?.status === "pending" &&
      bidders[bidders.length - 1]?.name !== bidderName
    ) {
      // This loops has O(n^2) complexity on bids (n*n iterations), which can be a lot if many bids have been placed
      // not sure if we need unique bidders here, but it can be optimized
      // (put ids in a Set?)
      const uniqueBidders = bidders.filter(
        (elem, ix) =>
          bidders.findIndex((elem1) => elem1.name === elem.name) === ix
      );

      // I do not understand the logic of this loop (especially the if else if)
      for (let i = 0; i < uniqueBidders.length; i++) {
        // This should be stored in a var to avoid many looping
        // An improved name woudld be `highbid` IIUC
        const bid = bidders.filter(
          (data) => data.auction_id === auctions[auctions.length - 1]?.id
        );

        if (
          uniqueBidders[i].name === bid[i]?.name &&
          bid[i]?.name === bidderName
        ) {
          hasOutbid = true;
          break;
        } else if (
          uniqueBidders[i].name !== bidders[bidders.length - 1]?.name &&
          bid[i]?.name === bidderName
        ) {
          hasOutbid = true;
          break;
        }
      }
    }

    if (hasOutbid) {
      setMessage("You have been outbid! Bid again!");
      toast.warning("You have been outbid! Bid again!");
    }
    // I think this works, but it would probably be easier to have the highBid data somewhere and just use that as a dependency for the outbid logic
  }, [bidders.length]);

  // Name suggestion: handleLogin
  // This does not make use of provided session management, the user has to login again after refreshing the page
  const handleBidderSubmit = async (event) => {
    event.preventDefault();
    if (bidderName.trim() === "") {
      setShowValidation(true);
      return;
    }
    setIsLoggingIn(true);
    // This condition seems redundant with the above if?
    if (bidderName) {
      setUserType("Bidder");
      const data = {
        name: bidderName,
        userType: "Biddder",
      };
      await api.post(`login`, data);
      setTimeout(() => {
        // Why wait 2sec here? did it not `await` already for the api call?
        setIsLoggingIn(false);
        toast.success("Login successful!");
        setShowBidderModal(true);
      }, 2000);
      // I think that the logic below is more an effect of the log in, rather than part of it
      setBidAmount(
        auctions.length > 0 && bidders.length === 0
          ? parseInt(auctions[auctions.length - 1].price) + 100
          : bidders[bidders.length - 1]?.auction_id ===
            auctions[auctions.length - 1]?.id
          ? bidders.length !== 0 &&
            parseInt(bidders[bidders.length - 1].amount) + 100
          : parseInt(auctions[auctions.length - 1].price) + 100
      );
    }
  };

  // Name suggestion: handleSubmitBid
  const handlebidderModalSubmit = async (event) => {
    // Why use a button with type=submit and then disable this? Probably easier to remove both
    event.preventDefault();
    const data = {
      auction_id: auctions.length > 0 && auctions[auctions.length - 1].id,
      amount: bidAmount,
      name: bidderName,
    };
    // This does not check starting price
    const bidAmountCheck =
      bidders.length !== 0
        ? auctions[auctions.length - 1].id ===
          bidders[bidders.length - 1].auction_id
          ? bidders[bidders.length - 1]?.amount
          : auctions[auctions.length - 1]?.price
        : auctions[auctions.length - 1].price;
    if (bidAmountCheck >= bidAmount) {
      return toast.error("Amount must be more than current price");
    }
    await api.post(`bids`, data);
    // Not sure why this is needed?
    setBidStatus(true);
    // Same question as above rel timeout
    setTimeout(() => {
      setBidStatus(false);
      toast.success("Bid successful! You are currently the highest bidder.");
    }, 1000);
  };
  // Note: this is a bit unusual UI to have a modal open/close act as authenticated/unauthenticated UI
  const handlebidderModalClose = () => {
    setShowBidderModal(false);
  };
  const handleNameChange = (event) => {
    if (showValidation) {
      setShowValidation(false);
    }
    setBidderName(event.target.value);
  };
  return (
    <Container className="container-box">
      <h1 className="heading-text">Bidding Platform 2.0</h1>
      <Card className="custom-card">
        <Card.Body>
          <div className="back-button">
            <div>
              <Link to="/">
                <FaArrowLeft className="back-icon" />
              </Link>
            </div>
            <div style={{ marginLeft: "10px" }}>
              <Card.Title>Bidder</Card.Title>
            </div>
          </div>
          <hr />
          {showValidation && (
            <Alert variant="danger">Please enter your name.</Alert>
          )}
          <Form onSubmit={handleBidderSubmit}>
            <Form.Group controlId="auctioneerName" className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter name"
                value={bidderName}
                onChange={handleNameChange}
              />
            </Form.Group>
            <Button
              variant="primary"
              type="submit"
              disabled={isLoggingIn}
              className="all-button"
            >
              {isLoggingIn ? (
                <>
                  <Spinner animation="border" size="sm" /> Logging in...
                </>
              ) : (
                "Bidder Login"
              )}
            </Button>
          </Form>
        </Card.Body>
        <ToastContainer position="top-right" autoClose={3000} />
      </Card>
      <Modal
        show={showBidderModal}
        onHide={handlebidderModalClose}
        backdrop="static"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Bidding View</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="item-name">
              <Form.Label>Your Name - </Form.Label>
              <Form.Label className="product-name">{bidderName}</Form.Label>
            </Form.Group>
            {/* These could be displayed using ternary op */}
            {auctions.length > 0 && (
              <Form.Group controlId="item-name">
                <Form.Label>Auction Item - </Form.Label>
                <Form.Label className="product-name">
                  <Form.Label>
                    {
                      // Redundant condition
                      auctions.length > 0 && auctions[auctions.length - 1].name
                    }
                  </Form.Label>
                </Form.Label>
              </Form.Group>
            )}
            {auctions.length === 0 && "There is no Auction item"}
            {auctions.length > 0 && (
              <Form.Group controlId="startingPrice" className="mb-3">
                <Form.Label>Current Price -</Form.Label>

                {bidders.length !== 0 ? (
                  <Form.Label className="product-name">
                    {bidders[bidders.length - 1].auction_id ===
                      auctions[auctions.length - 1].id
                      ? "$" + bidders[bidders.length - 1].amount
                      : auctions[auctions.length - 1].price}
                  </Form.Label>
                ) : (
                  <Form.Label className="product-name">
                    {" "}
                    {"$" + auctions[auctions.length - 1]?.price}
                  </Form.Label>
                )}
              </Form.Group>
            )}
            {
              // Condition lready checked, maybe group the common JSX
              auctions.length > 0 && (
                <Form.Group controlId="item-name">
                  <Form.Label> Auction Item Current Status -</Form.Label>
                  <Form.Label className="current-status">
                    {auctions[auctions.length - 1]?.buttonStatus === "Stop"
                      ? "Stop Auction"
                      : auctions[auctions.length - 1].status !== "pending"
                      ? auctions[auctions.length - 1]?.status === "sold"
                        ? bidderName === bidders[bidders.length - 1]?.name
                          ? `You won this item for $${
                              bidders[bidders.length - 1]?.amount
                            }!`
                          : auctions[auctions.length - 1]?.status
                        : auctions[auctions.length - 1]?.status
                      : bidders[bidders.length - 1]?.name === bidderName
                      ? "You are the highest bidder."
                      : bidders.filter(
                          (data) =>
                            data.auction_id ===
                            auctions[auctions.length - 1]?.id
                        ).length === 0
                      ? "Accepting Bids"
                      : !message
                      ? "Accepting Bids"
                      : message}
                  </Form.Label>
                  <hr />
                  <p className="headline-text">Bidding History</p>
                  {bidders[bidders.length - 1]?.auction_id ===
                  auctions[auctions.length - 1].id ? (
                    <div className="price-container">
                      <div>
                        <p>{bidders[bidders.length - 1].name}</p>
                      </div>
                      <div>
                        <p className="product-name">
                          {" "}
                          {"$" + bidders[bidders.length - 1].amount}
                        </p>
                      </div>
                    </div>
                  ) : (
                    ""
                  )}
                </Form.Group>
              )
            }
            <hr />${" "}
            <input
              type="number"
              className="text-center "
              style={{ width: "30%" }}
              disabled={
                auctions.length !== 0 &&
                  auctions[auctions.length - 1].buttonStatus === "Stop"
                  ? true
                  : auctions.length === 0
                    ? true
                    : auctions[auctions.length - 1].status !== "pending" && true
              }
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
            />
            <Button
              variant="primary"
              type="submit"
              className="extra-button"
              onClick={(e) => handlebidderModalSubmit(e)}
              disabled={
                auctions.length !== 0 &&
                  auctions[auctions.length - 1].buttonStatus === "Stop"
                  ? true
                  : auctions.length === 0
                    ? true
                    : auctions[auctions.length - 1].status !== "pending" && true
              }
            >
              Bid
            </Button>
            <Button
              variant="btn btn-outline-secondary"
              className="extra-button"
              onClick={() => {
                setBidAmount(parseInt(bidAmount) + 100);
              }}
              disabled={
                auctions.length !== 0 &&
                  auctions[auctions.length - 1].buttonStatus === "Stop"
                  ? true
                  : auctions.length === 0
                    ? true
                    : auctions[auctions.length - 1].status !== "pending" && true
              }
            >
              +100
            </Button>
            <Button
              variant="btn btn-outline-secondary"
              className="extra-button"
              onClick={() => setBidAmount(parseInt(bidAmount) + 200)}
              disabled={
                auctions.length !== 0 &&
                  auctions[auctions.length - 1].buttonStatus === "Stop"
                  ? true
                  : auctions.length === 0
                    ? true
                    : auctions[auctions.length - 1].status !== "pending" && true
              }
            >
              +200
            </Button>
            <Button
              variant="danger"
              className="extra-button"
              onClick={() =>
                setBidAmount(bidders[bidders.length - 1].amount + 100)
              }
              disabled={
                auctions.length !== 0 &&
                  auctions[auctions.length - 1].buttonStatus === "Stop"
                  ? true
                  : auctions.length === 0
                    ? true
                    : auctions[auctions.length - 1].status !== "pending" && true
              }
            >
              Reset
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default Bidder;
