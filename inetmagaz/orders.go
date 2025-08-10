package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
)

type Order struct {
	User_id    int       `json:"user_id"`
	Status     string    `json:"status"`
	TotalPrice int       `json:"total_price"`
	CreatedAt  time.Time `json:"created_at"`
}
type OrderforA struct {
	User_id    int       `json:"user_id"`
	ID         int       `json:"id"`
	Status     string    `json:"status"`
	TotalPrice int       `json:"total_price"`
	CreatedAt  time.Time `json:"created_at"`
}
type OrderDisplay struct {
	ID         int       `json:"id"`
	Status     string    `json:"status"`
	TotalPrice int       `json:"total_price"`
	CreatedAt  time.Time `json:"created_at"`
}
type UpdateStatus struct {
	ID     int    `json:"id"`
	Status string `json:"status"`
}

func updateStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	username := r.Context().Value(usernameKey)
	if username == nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	var role string
	err := db.QueryRow("select role from users where username = $1", username).Scan(&role)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if role == "admin" {
		var u UpdateStatus
		err := json.NewDecoder(r.Body).Decode(&u)
		if err != nil {
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
		_, err = db.Exec("update orders set status = $1 where id = $2", u.Status, u.ID)
		if err != nil {
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"message": "updated!",
		})
	} else {
		http.Error(w, "only admin can change status", http.StatusServiceUnavailable)
		return
	}
}

func postOrders(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusBadRequest)
		return
	}
	username := r.Context().Value(usernameKey)
	if username == nil {
		http.Error(w, "invalid username", http.StatusInternalServerError)
		return
	}
	var o Order
	err := json.NewDecoder(r.Body).Decode(&o)
	if err != nil {
		http.Error(w, "error while decoding json", http.StatusInternalServerError)
		return
	}
	err = db.QueryRow("select id from users where username = $1", username).Scan(&o.User_id)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	_, err = db.Exec("insert into orders (user_id, status, total_price, created_at) values ($1,$2,$3,$4)", o.User_id, o.Status, o.TotalPrice, o.CreatedAt)
	if err != nil {
		http.Error(w, "error while inserting data", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "order created!",
	})
}
func getAllOrders(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusBadRequest)
	}
	username := r.Context().Value(usernameKey)
	if username == nil {
		http.Error(w, "invalid username", http.StatusInternalServerError)
		return
	}
	var role string
	err := db.QueryRow("select role from users where username = $1", username).Scan(&role)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if role != "admin" {
		http.Error(w, "Permission denied", http.StatusMethodNotAllowed)
		return
	}
	var ords []OrderforA
	orows, err := db.Query("select * from orders")
	if err != nil {
		http.Error(w, "errror while getting data", http.StatusInternalServerError)
		return
	}
	defer orows.Close()
	for orows.Next() {
		var o OrderforA
		err := orows.Scan(&o.ID, &o.User_id, &o.Status, &o.TotalPrice, &o.CreatedAt)
		if err != nil {
			http.Error(w, "error while getting data", http.StatusInternalServerError)
			return
		}
		ords = append(ords, o)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ords)
}

func getOrders(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusBadRequest)
		return
	}
	username := r.Context().Value(usernameKey)
	if username == nil {
		http.Error(w, "invalid username", http.StatusInternalServerError)
		return
	}
	var ords []OrderDisplay
	orows, err := db.Query("select orders.id, orders.status, orders.total_price, orders.created_at from orders join users on users.id = orders.user_id where users.username = $1", username)
	if err != nil {
		http.Error(w, "errror while getting data", http.StatusInternalServerError)
		return
	}
	defer orows.Close()
	for orows.Next() {
		var o OrderDisplay
		err := orows.Scan(&o.ID, &o.Status, &o.TotalPrice, &o.CreatedAt)
		if err != nil {
			http.Error(w, "error while getting data", http.StatusInternalServerError)
			return
		}
		ords = append(ords, o)
	}
	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(ords)
}

func getOrderbyID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusBadRequest)
		return
	}

	username := r.Context().Value(usernameKey)
	if username == nil {
		http.Error(w, "invalid username", http.StatusInternalServerError)
		return
	}
	Strid := chi.URLParam(r, "id")
	if Strid == "update" {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id, err := strconv.Atoi(Strid)
	if err != nil {
		http.Error(w, "invalid param", http.StatusInternalServerError)
		return
	}
	var o OrderDisplay
	row := db.QueryRow("select orders.id, orders.status, orders.total_price,orders.created_at from orders join users on users.id = orders.user_id where users.username = $1 and orders.id = $2", username, id)
	err = row.Scan(&o.ID, &o.Status, &o.TotalPrice, &o.CreatedAt)
	if err != nil {
		http.Error(w, "Internal server errror", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(o)
}
