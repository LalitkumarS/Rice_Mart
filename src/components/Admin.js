// Admin.js
import React, { useEffect, useState } from "react";
import { Table, Container, Alert, Button } from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

const Admin = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    const fetchOrders = async () => {
      setError(null);
      if (!user) {
        setError("You must be logged in as an admin to view this page.");
        return;
      }
      try {
        const token = await user.getIdToken();
        const response = await axios.get(`${API_URL}/api/admin/all-orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (Array.isArray(response.data)) {
          setOrders(response.data);
        } else {
          console.error("Admin: Unexpected response format for all orders:", response.data);
          setOrders([]);
          setError("Received unexpected data format from server.");
        }
      } catch (err) {
        console.error("Admin: Error fetching all orders:", err);
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          setError(`Failed to fetch orders: ${err.response.data.message || err.response.statusText || 'Server error'}`);
        } else if (err.request) {
          // The request was made but no response was received
          setError("Failed to fetch orders: No response from server. Is it running?");
        } else {
          // Something happened in setting up the request that triggered an Error
          setError("Failed to fetch orders: Error setting up request.");
        }
        setOrders([]); // Clear orders on error
      }
    };

    fetchOrders();
  }, [user]);

  // Mark order as completed
  const handleComplete = async (orderId) => {
    setError(null); // Clear previous errors
    setSuccess(""); // Clear previous success
    try {
      const token = await user.getIdToken();
      await axios.put(`${API_URL}/api/orders/${orderId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId ? { ...order, status: "Completed" } : order
        )
      );
      setSuccess("Order status updated to completed successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Admin: Error updating order status:", err);
      if (err.response) {
        setError(`Failed to update order status: ${err.response.data.message || err.response.statusText || 'Server error'}`);
      } else {
        setError("Failed to update order status. Please try again.");
      }
    }
  };

  return (
    <Container className="mt-5 pt-4"> {/* Added Bootstrap margin-top utility */}
      <h2 className="my-4 text-center">ALL CUSTOMER ORDERS</h2> {/* Centered heading */}
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess("")} dismissible>{success}</Alert>}
      <Table striped bordered hover responsive className="shadow-sm"> {/* Added responsive and shadow */}
        <thead className="table-dark"> {/* Darker header */}
          <tr>
            <th>Order ID</th>
            <th>Product(s)</th>
            <th>Total Quantity</th>
            <th>Total Price</th>
            <th>Customer Name</th>
            <th>Customer Email</th>
            <th>Order Placed At</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.length > 0 ? (
            orders.map((order) => (
              <tr key={order._id}>
                <td><code>{order._id}</code></td> {/* Use code tag for ID */}
                <td>
                  {order.cartItems && order.cartItems.length > 0 ? (
                    <ul className="list-unstyled mb-0">
                      {order.cartItems.map((item, idx) => (
                        <li key={idx} className={idx > 0 ? "mt-1 pt-1 border-top" : ""}>
                          {item.name} (x{item.quantity}) - ₹{item.price?.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    order.productName || "N/A"
                  )}
                </td>
                <td className="text-center"> {/* Centered quantity */}
                  {order.cartItems && order.cartItems.length > 0
                    ? order.cartItems.reduce((sum, item) => sum + item.quantity, 0)
                    : order.quantity || 0}
                </td>
                <td className="text-end">₹{order.totalPrice?.toFixed(2)}</td> {/* Right-aligned price */}
                <td>{order.userDetails?.name || "N/A"}</td>
                <td>{order.userDetails?.email || "N/A"}</td>
                <td>{new Date(order.createdAt).toLocaleString()}</td>
                <td>
                  <span className={`badge bg-${order.status === "Completed" ? "success" : "warning"} text-dark`}>
                    {order.status}
                  </span>
                </td>
                <td>
                  {order.status !== "Completed" ? (
                    <Button
                      variant="outline-success" // Changed to outline
                      size="sm"
                      onClick={() => handleComplete(order._id)}
                    >
                      Mark Completed
                    </Button>
                  ) : (
                    <span className="text-success fw-bold">Completed</span>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="9" className="text-center p-4"> {/* Increased colspan */}
                No orders found.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </Container>
  );
};

export default Admin;