package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

type Product struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Price       int    `json:"price"`
	Stock       int    `json:"stock"`
	Image       string `json:"image"`
}
type Productl struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Price int    `json:"price"`
	Image string `json:"image"`
}

func deleteProduct(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusBadRequest)
		return
	}
	username := r.Context().Value(usernameKey)
	if username == nil {
		http.Error(w, "No username in context", http.StatusServiceUnavailable)
		return
	}
	row := db.QueryRow("select role from users where username = $1", username)
	var role string
	err := row.Scan(&role)
	if err != nil {
		http.Error(w, "No role on user", http.StatusNotFound)
		return
	}
	if role == "admin" {
		id := chi.URLParam(r, "id")
		_, err := db.Exec("delete from products where id = $1", id)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			log.Print(err)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Deleted successfully!",
		})
	} else {
		http.Error(w, "User can't to delete products!", http.StatusServiceUnavailable)
		return
	}

}

func getProductByID(w http.ResponseWriter, r *http.Request) {
	Strid := chi.URLParam(r, "id")
	id, err := strconv.Atoi(Strid)
	if err != nil {
		http.Error(w, "invalid param", http.StatusInternalServerError)
		return
	}
	var p Product
	row := db.QueryRow("select * from products where id = $1", id)
	err = row.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.Stock, &p.Image)
	if err == sql.ErrNoRows {
		http.Error(w, "product not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		log.Panic(err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func putProduct(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "method is not allowed", http.StatusBadRequest)
		return
	}
	username := r.Context().Value(usernameKey)
	if username == nil {
		http.Error(w, "No username in context", http.StatusServiceUnavailable)
		return
	}
	var role string
	row := db.QueryRow("select role from users where username = $1", username)
	err := row.Scan(&role)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	if role == "admin" {
		id := chi.URLParam(r, "id")
		var p Product
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}
		_, err := db.Exec("UPDATE products SET name = CASE WHEN $1 = '' THEN name ELSE $1 END, description = CASE WHEN $2 = '' THEN description ELSE $2 END, price = $3, stock = CASE WHEN $4 = 0 THEN stock ELSE $4 END, image = CASE WHEN $5 = '' THEN image ELSE $5 END WHERE id = $6", p.Name, p.Description, p.Price, p.Stock, p.Image, id)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			log.Print(err)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Updated successfully!",
		})
	} else {
		http.Error(w, "User can't put products!", http.StatusNotAcceptable)
		return
	}
}

func getProducts(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("select id,name, price,image from products")
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		log.Panic(err)
	}
	defer rows.Close()
	var products []Productl
	for rows.Next() {
		p := Productl{}
		err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.Image)
		if err != nil {
			log.Print("something with db", err)
			continue
		}
		products = append(products, p)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}
func postProducts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method is not allowed", http.StatusBadRequest)
		return
	}
	username := r.Context().Value(usernameKey)
	if username == nil {
		http.Error(w, "No username in context", http.StatusServiceUnavailable)
		return
	}
	var role string
	row := db.QueryRow("select role from users where username = $1", username)
	err := row.Scan(&role)
	if err != nil {
		http.Error(w, "invalid data", http.StatusInternalServerError)
		return
	}
	if role == "admin" {
		var products []Product
		if err := json.NewDecoder(r.Body).Decode(&products); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}
		tx, err := db.Begin()
		if err != nil {
			http.Error(w, "Transaction error", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		for _, product := range products {
			_, err := tx.Exec("insert into products (name,description,price,stock,image) values ($1,$2,$3,$4,$5)", product.Name, product.Description, product.Price, product.Stock, product.Image)
			if err != nil {
				http.Error(w, "Insert failed", http.StatusInternalServerError)
				return
			}
		}
		tx.Commit()
		// for _, product := range products {
		// 	_, err := db.Exec("insert into products (name,description,price,stock,image) values ($1,$2,$3,$4,$5)", product.Name, product.Description, product.Price, product.Stock, product.Image)
		// 	if err != nil {
		// 		log.Panic(err)
		// 		continue
		// 	}
		// }
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Products posted!",
		})
	} else {
		http.Error(w, "User can't post products!", http.StatusNotAcceptable)
		return
	}
}
