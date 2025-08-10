package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
)

type Cart struct {
	Product_ID int `json:"product_id"`
	Quantity   int `json:"quantity"`
}
type DCart struct {
	ID            int    `json:"id"`
	Product_name  string `json:"product_name"`
	Product_price string `json:"product_price"`
	Quantity      int    `json:"quantity"`
}
type idjson struct {
	ID int `json:"id"`
}

func clearCart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusInternalServerError)
		return
	}
	username := r.Context().Value(usernameKey)
	if username == nil {
		http.Error(w, "error while getting username", http.StatusInternalServerError)
		return
	}

	_, err := db.Exec("delete from cart using users where cart.user_id = users.id and users.username = $1", username)
	if err != nil {
		http.Error(w, "error while clearing table", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Cleared successfully",
	})
}

func removefromCart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	username := r.Context().Value(usernameKey)
	if username == nil {
		http.Error(w, "error while getting username", http.StatusInternalServerError)
		return
	}
	var idcart idjson
	if err := json.NewDecoder(r.Body).Decode(&idcart); err != nil {
		http.Error(w, "error while parsing json", http.StatusInternalServerError)
		return
	}
	_, err := db.Exec("delete from cart using users where cart.user_id = users.id and users.username = $1 and cart.id = $2", username, idcart.ID)
	if err != nil {
		http.Error(w, "error while removing cart", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Deleted successfully",
	})
}

func addCart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusBadRequest)
		return
	}
	username := r.Context().Value(usernameKey)
	if username == nil {
		http.Error(w, "no username in context", http.StatusInternalServerError)
		return
	}
	var ID int
	row := db.QueryRow("select id from users where username = $1", username)
	err := row.Scan(&ID)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	var c []Cart
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, "Invalid json format", http.StatusNonAuthoritativeInfo)
		return
	}
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Transaction error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	for _, cart := range c {
		row := db.QueryRow("select stock from products where id = $1", cart.Product_ID)
		var stock int
		err := row.Scan(&stock)
		if err == sql.ErrNoRows {
			http.Error(w, "Invalid product id", http.StatusInternalServerError)
			return
		} else if err != nil {
			http.Error(w, "internal server error", http.StatusInternalServerError)
			log.Panic(err)
			return
		}
		if (stock - cart.Quantity) < 0 {
			http.Error(w, "too much quantity", http.StatusInternalServerError)
			return
		}
		_, err = tx.Exec("insert into cart (user_id,product_id,quantity) values ($1,$2,$3)", ID, cart.Product_ID, cart.Quantity)
		if err != nil {
			http.Error(w, "failed to insert cart", http.StatusInternalServerError)
			log.Panic(err)
			return
		}
	}
	tx.Commit()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Cart added successfully!",
	})
}

func getCart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusBadRequest)
		return
	}
	username := r.Context().Value(usernameKey)
	if username == nil {
		http.Error(w, "no username in context", http.StatusInternalServerError)
		return
	}
	cartrows, err := db.Query("select cart.id, products.name,products.price,cart.quantity from cart join users on users.id = cart.user_id join products on products.id = cart.product_id where users.username = $1", username)
	if err != nil {
		http.Error(w, "error while getting cart", http.StatusInternalServerError)
		log.Panic(err)
		return
	}
	var cs []DCart
	defer cartrows.Close()
	for cartrows.Next() {
		var c DCart
		err := cartrows.Scan(&c.ID, &c.Product_name, &c.Product_price, &c.Quantity)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			log.Panic(err)
			return
		}
		cs = append(cs, c)
	}
	if cs == nil {
		cs = []DCart{}
	}
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(cs)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		log.Panic(err)
		return
	}
}
