import React, { useEffect, useState, useMemo } from "react";
import {
  Card,
  Button,
  Form,
  Modal,
  Row,
  Col,
  Container,
  Alert,
  Spinner,
} from "react-bootstrap";
import "./style.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import socketIo from "socket.io-client";
import api from "../api";
import { FaArrowLeft } from "react-icons/fa";
import { Link } from "react-router-dom";

const ENDPOINT = "http://localhost:5000";
let socket;

// See comments in Bidder.js that also apply here
// The code that is similar should be raised in Home.js, especially auth, and shared bidding state/socket if they dont differ much
////  In the Socket functionality cannot be implemented on the home.js file because when accessed from the Home.js file 
////  the socket doesn't work. Therefore, it is necessary to keep the socket implementation in a separate file.
////  For this simple project, may have been better to use normal vanilla ws now that I'm thinking about it but was familiar with socket.io from other projects

const Clerk = () => {
  const [clerkName, setClerkName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [itemName, setItemName] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [auctions, setAuctions] = useState([]);
  const [bidders, setBidders] = useState([]);
  const [showValidation, setShowValidation] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [auctionStatus, setAuctionStatus] = useState(false);


  useEffect(
    function connectSocketAuctionBids() {
      socket = socketIo(ENDPOINT, { transports: ["websocket"] });
      socket.on("getAuction", function (data) {
        setAuctions(data);
      });
      socket.on("getBids", (data) => {
        setBidders(data);
      });
    }, [auctionStatus]);

  useEffect(
    function getItemsFromLocalStorage() {
      const savedClerkName = localStorage.getItem("clerkName");
      const savedModalState = localStorage.getItem("clerkModal");
      if (savedClerkName) {
        setClerkName(savedClerkName);
      }

      if (savedModalState === "true") {
        setShowModal(true);
      }
    }, []);

  // Clear localStorage and sessionStorage
  const handleCloseModal = () => {
    localStorage.removeItem("clerkName");
    sessionStorage.removeItem("clerkModal");
    setShowModal(false);
  };

  const handleAuctioneerSubmit = async (event) => {
    event.preventDefault();
    if (clerkName.trim() === "") {
      setShowValidation(true);
      return;
    }
    setIsLoggingIn(true);
    const data = {
      name: clerkName,
      userType: "Auctioneer",
    };
    await api.post(`login`, data);

    setIsLoggingIn(false);
    toast.success("Login successful!");
    setShowModal(true);
    document.cookie = `clerkName=${clerkName}; max-age=${7 * 24 * 60 * 60}`;
    localStorage.setItem("clerkName", clerkName);
    localStorage.setItem("clerkModal", true);
  };

  const handleModalSubmit = async (event) => {
    event.preventDefault();
    if (!itemName || !startingPrice) {
      toast.error("Please Enter Item Name and Starting Price.");
      return;
    }
    const data = {
      name: itemName,
      price: startingPrice,
    };
    await api.post("auctions", data);
    setAuctionStatus(true);

    setTimeout(() => {
      setAuctionStatus(false);
    }, [1000]);

    setItemName("");
    setStartingPrice("");
    toast.success("Your item is ready to sell!");
  };

  const handleNameChange = (event) => {
    if (showValidation) {
      setShowValidation(false);
    }
    setClerkName(event.target.value);
  };
  const handleAuctionStatus = async (status) => {
    const data = {
      id: auctions.length > 0 && auctions[auctions.length - 1]?.id,
    };
    const updatedData = {
      status: status,
    };
    await api.put(`auctions/${data.id}`, updatedData);
    setAuctionStatus(true);

    setTimeout(() => {
      setAuctionStatus(false);
    }, [1000]);
  };

  const handleStartButtonClick = async (event) => {
    event.preventDefault();
    const data = {
      id: auctions.length > 0 && auctions[auctions.length - 1].id,
    };
    const updatedData = {
      status: "pending",
    };
    await api.put(`auctions/${data.id}`, updatedData);
    setAuctionStatus(true);

    setTimeout(() => {
      setAuctionStatus(false);
    }, [1000]);
  };

  const handleStopButtonClick = async (event) => {
    const data = {
      id: auctions.length > 0 && auctions[auctions.length - 1].id,
    };
    const updatedData = {
      status: "pending",
      buttonStatus: "Stop",
    };
    await api.put(`auctions/${data.id}`, updatedData);
    setAuctionStatus(true);

    setTimeout(() => {
      setAuctionStatus(false);
    }, [1000]);
  };
  const filteredBidders = useMemo(() => {
    return bidders.filter(
      (bid) => bid.auction_id === auctions[auctions.length - 1]?.id
    );
  }, [bidders, auctions]);
  const handleAddAuction = () => {
    setAuctions([]);
    setBidders([]);
  };

  return (
    <Container className="container-box">
      <h1 className="heading-text">Bidding Platform 2.0</h1>

      <div>
        <div className="flex-container">
          <Row>
            <Col>
              <Card>
                <Card.Body>
                  <div className="back-button">
                    <div>
                      <Link to="/">
                        <FaArrowLeft className="back-icon" />
                      </Link>
                    </div>
                    <div style={{ marginLeft: "10px" }}>
                      <Card.Title>Auctioneer Screen</Card.Title>
                    </div>
                  </div>
                  <hr />
                  {showValidation && (
                    <Alert variant="danger">Please enter your name!</Alert>
                  )}

                  <Form onSubmit={handleAuctioneerSubmit}>
                    <Form.Group controlId="clerkName" className="mb-4">
                      <Form.Label>Name</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter name"
                        value={clerkName}
                        onChange={handleNameChange}
                      />
                    </Form.Group>
                    <Row>
                      <Col>
                        <Button
                          variant="primary"
                          type="submit"
                          disabled={isLoggingIn}
                          className="all-button"
                        >
                          {isLoggingIn ? (
                            <>
                              <Spinner animation="border" size="sm" /> Logging
                              in...
                            </>
                          ) : (
                            "Auction Login"
                          )}
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            <ToastContainer position="top-right" autoClose={2000} />
          </Row>
        </div>
        {/* aution model --------------------------- */}
        <Modal
          show={showModal}
          onHide={handleCloseModal}
          backdrop="static"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Auction Clerk</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group controlId="itemName">
                <Form.Label>Your Name -</Form.Label>
                <Form.Label className="product-name"> {clerkName}</Form.Label>
                <Button
                  className="add-button text-white"
                  class="btn btn-outline-success"
                  variant="success"
                  type="button"
                  onClick={() => handleAddAuction()}
                >
                  Add Item
                </Button>
              </Form.Group>

              <Form.Group controlId="itemName">
                <Form.Label>Auction Item </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter item name"
                  value={
                    auctions.length > 0
                      ? auctions[auctions.length - 1].name
                      : itemName
                  }
                  onChange={(event) => setItemName(event.target.value)}
                />
              </Form.Group>
              <Form.Group controlId="startingPrice" className="mb-3">
                <Form.Label>Starting Price</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="Enter starting price"
                  value={
                    auctions.length > 0
                      ? auctions[auctions.length - 1].price
                      : startingPrice
                  }
                  onChange={(event) => setStartingPrice(event.target.value)}
                />
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                onClick={
                  auctions.length === 0
                    ? handleModalSubmit
                    : handleStartButtonClick
                }
                disabled={auctions.length > 0 ? false : false}
              >
                Start Auction
              </Button>
              <Button
                className="stop-button"
                variant="danger"
                type="button"
                onClick={() => handleStopButtonClick()}
                disabled={
                  auctions.length === 0 ||
                  auctions[auctions.length - 1]?.buttonStatus === "Stop" ||
                  auctions[auctions.length - 1].status !== "pending"
                }
              >
                Stop Auction
              </Button>

              <hr />
              <p className="headline-text">Starting Bid</p>
              <p className="price-text">
                {auctions.length !== 0 &&
                  auctions[auctions.length - 1]?.name +
                  "  -  " +
                  "$" +
                  auctions[auctions.length - 1]?.price}
              </p>
              <hr />
              <p className="headline-text">Bidding History</p>
              {filteredBidders.map((data) => (
                <div className="price-container" key={data.id}>
                  <div>
                    <p>{data.name}</p>
                  </div>
                  <div>
                    <p className="product-name">${data.amount}</p>
                  </div>
                </div>
              ))}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="danger"
              disabled={
                auctions.length === 0
                  ? true
                  : auctions[auctions.length - 1].status !== "pending" && true
              }
              onClick={() => handleAuctionStatus("no_sale")}
            >
              NO SALE
            </Button>
            <Button
              variant="success"
              disabled={
                auctions.length === 0
                  ? true
                  : auctions[auctions.length - 1].status !== "pending" && true
              }
              onClick={() => handleAuctionStatus("sold")}
            >
              SOLD
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </Container>
  );
};

export default Clerk;
