import React from "react";
import { Card, Button, Form, Row, Col, Container } from "react-bootstrap";
import "./style.css";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <Container className="container-box">
      <h1 className="heading-text">Bidding Platform 2.0</h1>
      <div>
        <Row>
          <Col>
            <Card>
              <Card.Body>
                <Card.Title>Choose Your Login</Card.Title>
                <hr />
                <Form>
                  <Form.Group
                    controlId="auctioneerName"
                    className="mb-4"
                  ></Form.Group>
                  <Row>
                    <Col>
                      <Button
                        variant="primary"
                        className="all-button"
                        onClick={() => navigate("/clerk")}
                      >
                        Clerk Login
                      </Button>
                    </Col>
                    <Col>
                      <Button
                        className="all-button"
                        onClick={() => navigate("/bidder")}
                      >
                        Bidder Login
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </Container>
  );
};

export default Home;
