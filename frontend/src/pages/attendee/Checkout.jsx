import React, { useEffect } from 'react'
import { Calendar, MapPin, Ticket, DollarSign } from 'lucide-react'
import { useState } from 'react';
import axios from 'axios';
import { useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Checkout = () => {
  const { id } = useParams();
  const location = useLocation();
  const [event, setEvent] = useState({})

  // Get data passed from Seats page
  const {
    selectedSeats = [],
    ticketCost = 0
  } = location.state || {};

  const [ticketData, setTicketData] = useState(null);
  const [showTicketOptions, setShowTicketOptions] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const apiError = (error, fallback) => error?.response?.data?.message || fallback;

  // Books the ticket once a payment has been verified by the backend.
  const bookTicket = async (paymentId) => {
    const ticket = await axios.post(`${import.meta.env.VITE_API}/events/book-ticket`, {
      event_id: id,
      booking_dateTime: new Date().toISOString(),
      payment_id: paymentId,
    });
    toast.success(ticket.data.message || 'Booking successful!');
    setTicketData(ticket.data.booking);
    setShowTicketOptions(true);
  };

  const handlePayment = async () => {
    if (!selectedSeats.length) {
      toast.error('Please select your seats first.');
      return;
    }
    setIsPaying(true);
    try {
      // Make sure nobody else grabbed the seats while we were on this page.
      await axios.post(`${import.meta.env.VITE_API}/events/check-seats-with-locks`, {
        event_id: id,
        seats: selectedSeats
      });

      // The server prices the order from the event's ticket cost.
      const { data: order } = await axios.post(`${import.meta.env.VITE_API}/payment/order`, {
        event_id: id,
        seats: selectedSeats
      });

      if (order.demo) {
        // No Razorpay keys on the server: simulate a successful payment.
        const { data: verified } = await axios.post(`${import.meta.env.VITE_API}/payment/verify`, {
          razorpay_order_id: order.data.id,
        });
        toast.success('Demo payment approved');
        await bookTicket(verified.payment_id);
        setIsPaying(false);
        return;
      }

      if (!window.Razorpay) {
        toast.error('Payment gateway failed to load. Please refresh and try again.');
        setIsPaying(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY,
        amount: order.data.amount,
        currency: order.data.currency,
        name: "showitup",
        description: event.title || "Event booking",
        order_id: order.data.id,
        handler: async (response) => {
          try {
            const { data: verified } = await axios.post(`${import.meta.env.VITE_API}/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await bookTicket(verified.payment_id);
          } catch (error) {
            toast.error(apiError(error, 'Booking failed after payment. Please contact support.'));
          } finally {
            setIsPaying(false);
          }
        },
        modal: { ondismiss: () => setIsPaying(false) },
        theme: { color: "#ea580c" }
      });
      rzp.open();
    } catch (error) {
      toast.error(apiError(error, 'Could not start payment. Please try again.'));
      setIsPaying(false);
    }
  };
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API}/events/get-events/${id}`);
        setEvent(response.data.event);
      } catch (error) {
        console.log(error);
      }
    };
    fetchEvent();
  }, [id, location.state]);
  
  const seatPrice = event.cost ?? ticketCost;
  const convenienceFee = 50;
  const finalTotal = selectedSeats.length * seatPrice + convenienceFee;

  const formatDate = (date) => {
    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const formatTime = (date) => {
    const dateObj = new Date(date);
    let hours = dateObj.getHours();
    let minutes = dateObj.getMinutes();
    let seconds = dateObj.getSeconds();
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    return `${hours}:${minutes}:${seconds}`;
};
  // PDF generation function
  const generatePDF = () => {
    if (!ticketData) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    // showitup logo as styled text
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#ea580c');
    doc.text('showitup', 40, 60);

    // Movie title
    doc.setFontSize(20);
    doc.setTextColor('#22223b');
    doc.text(ticketData.event_title || 'Event', 40, 100);

    // Details
    doc.setFontSize(12);
    let y = 130;
    doc.text(`Date & Time: ${formatDate(event.eventDateTime)} ${formatTime(event.eventDateTime)}`, 40, y);
    y += 20;
    doc.text(`Venue: ${event.location}`, 40, y);
    y += 20;
    doc.text(`Screen: SCREEN 1`, 40, y);
    y += 20;
    doc.text(`Seats: ${ticketData.seats}`, 40, y);
    y += 20;
    doc.text(`Booking ID: ${ticketData._id || ticketData.booking_id || ''}`, 40, y);
    y += 20;
    doc.text(`Amount Paid: ₹${ticketData.paymentAmt}`, 40, y);
    y += 30;

    // QR code (base64)
    if (ticketData.ticket_qr) {
      doc.text('Scan for entry:', 40, y);
      y += 10;
      doc.addImage(ticketData.ticket_qr, 'PNG', 40, y, 100, 100);
      y += 110;
    }

    // Message
    doc.setFontSize(13);
    doc.setTextColor('#3b82f6');
    doc.text('Enjoy your show! Please arrive 15 minutes early. For support, contact showitup.', 40, y + 30);

    // Save
    doc.save(`showitup_Ticket_${ticketData._id || 'booking'}.pdf`);
  };

  // Web Share API for PDF
  const sharePDF = async () => {
    if (!ticketData) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#ea580c');
    doc.text('showitup', 40, 60);
    doc.setFontSize(20);
    doc.setTextColor('#22223b');
    doc.text(ticketData.event_title || 'Event', 40, 100);
    doc.setFontSize(12);
    let y = 130;
    doc.text(`Date & Time: ${event.date} ${event.time}`, 40, y);
    y += 20;
    doc.text(`Venue: ${event.location}`, 40, y);
    y += 20;
    doc.text(`Screen: SCREEN 1`, 40, y);
    y += 20;
    doc.text(`Seats: ${ticketData.seats}`, 40, y);
    y += 20;
    doc.text(`Booking ID: ${ticketData._id || ticketData.booking_id || ''}`, 40, y);
    y += 20;
    doc.text(`Amount Paid: ₹${ticketData.paymentAmt}`, 40, y);
    y += 30;
    if (ticketData.ticket_qr) {
      doc.text('Scan for entry:', 40, y);
      y += 10;
      doc.addImage(ticketData.ticket_qr, 'PNG', 40, y, 100, 100);
      y += 110;
    }
    doc.setFontSize(13);
    doc.setTextColor('#3b82f6');
    doc.text('Enjoy your show! Please arrive 15 minutes early. For support, contact showitup.', 40, y + 30);
    // Share
    const pdfBlob = doc.output('blob');
    if (navigator.share) {
      const file = new File([pdfBlob], `showitup_Ticket_${ticketData._id || 'booking'}.pdf`, { type: 'application/pdf' });
      try {
        await navigator.share({
          files: [file],
          title: 'Your showitup Ticket',
          text: 'Here is your ticket!'
        });
      } catch {
        toast.error('Sharing cancelled or failed.');
      }
    } else {
      toast.error('Sharing not supported on this device.');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 ">
      <div className="glass rounded-2xl shadow-xl p-8 w-full max-w-2xl flex flex-col items-center border border-orange-400/20">
        <h2 className="text-3xl font-bold text-white mb-8">Confirm Your Booking</h2>

        {/* Event Details Section */}
        <div className="flex flex-col md:flex-row items-center gap-8 w-full mb-8 pb-8 border-b border-orange-400/20">
          <img src={event.banner} alt={event.title} className="w-32 h-44 object-cover rounded-lg shadow-lg border-2 border-orange-500" />
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-bold text-white mb-2">{event.title}</h3>
            <p className="text-orange-200 text-sm flex items-center justify-center md:justify-start gap-2 mb-1">
              <Calendar className="w-4 h-4" /> {formatDate(event.eventDateTime)}
            </p>
            <p className="text-orange-200 text-sm flex items-center justify-center md:justify-start gap-2 mb-1">
              <MapPin className="w-4 h-4" /> {event.location}
            </p>
            <p className="text-orange-300 text-xs mt-2"> Category : {event.eventType}</p>
          </div>
        </div>

        {/* Booking Summary Section */}
        <div className="w-full mb-8">
          <h4 className="text-xl font-semibold text-white mb-4">Booking Summary</h4>
          
          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-orange-200">
              <span>Seats ({selectedSeats.length})</span>
              <span className="font-semibold text-white flex items-center gap-2">
                <Ticket className="w-4 h-4" /> {selectedSeats.join(', ')}
              </span>
            </div>
            <div className="flex justify-between text-orange-200">
              <span>Price per seat</span>
              <span className="font-semibold text-white">₹{seatPrice}</span>
            </div>
            <div className="flex justify-between text-orange-200">
              <span>Convenience Fee</span>
              <span className="font-semibold text-white">₹{convenienceFee}</span>
            </div>
          </div>

          <div className="w-full flex justify-between items-center text-white font-bold text-2xl pt-4 border-t border-orange-400/20">
            <span>Total Payable</span>
            <span className="flex items-center gap-2">
              <span className="w-5 h-5" /> ₹{finalTotal}
            </span>
          </div>
        </div>

        {/* Payment Button */}
        <div className="relative w-full p-1 rounded-lg overflow-hidden shining-border">
          <button onClick={handlePayment} disabled={isPaying || showTicketOptions} className="w-full disabled:opacity-60 disabled:cursor-not-allowed bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-lg transition-colors shadow-lg text-xl relative z-10">
            {showTicketOptions ? 'Booked' : isPaying ? 'Processing...' : 'Proceed to Payment'}
          </button>
        </div>

        {showTicketOptions && (
          <div className="flex flex-col items-center mt-8">
            <button onClick={generatePDF} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-lg mb-3">Download Ticket (PDF)</button>
            <button onClick={sharePDF} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg">Share Ticket</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
