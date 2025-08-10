package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/golang-jwt/jwt/v4"
	"github.com/joho/godotenv"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var db *sql.DB
var jwt_key []byte

type contextKey string

const usernameKey contextKey = "username"

type RegistrationRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}
type ProfileRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}
type LoginRequest struct {
	NameorEmail string `json:"nameoremail"`
	Password    string `json:"password"`
}

func generateJWT(username string) (string, error) {
	claims := jwt.MapClaims{
		"username": username,
		"exp":      time.Now().Add(1 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwt_key)
}

func HashPassword(pswrd string) (string, error) {
	crypted, err := bcrypt.GenerateFromPassword([]byte(pswrd), bcrypt.DefaultCost)
	return string(crypted), err
}
func CheckPassword(hpass string, tpass string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hpass), []byte(tpass))
	return err == nil
}

func getProfile(w http.ResponseWriter, r *http.Request) {
	username := r.Context().Value(usernameKey)
	if username == nil {
		http.Error(w, "No username in context", http.StatusInternalServerError)
		return
	}
	var user ProfileRequest
	row := db.QueryRow("select username, email, role from users where username = $1", username)
	err := row.Scan(&user.Username, &user.Email, &user.Role)
	if err != nil {
		http.Error(w, "invalid data", http.StatusInternalServerError)
		log.Panic(err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}
func Registration(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method is not allowed", http.StatusBadRequest)
		return
	}
	var req RegistrationRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	hashed, err := HashPassword(req.Password)
	if err != nil {
		log.Panic(err)
		log.Print("something with hash")
	}
	_, err = db.Exec("insert into users (username,password_hash,email, role) values ($1,$2,$3,$4)", req.Username, hashed, req.Email, req.Role)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			http.Error(w, "Username or email already exists", http.StatusConflict)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		log.Panic(err)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "User registered!",
	})

}

func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method is not allowed", http.StatusBadRequest)
		return
	}
	var req LoginRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid RequestBody", http.StatusBadRequest)
		return
	}
	row := db.QueryRow("select username, password_hash from users where username = $1 or email = $1", req.NameorEmail)

	var password string
	var username string
	err = row.Scan(&username, &password)
	if err == sql.ErrNoRows {
		http.Error(w, "Invalid username or password", http.StatusUnauthorized)
		return
	} else if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	if CheckPassword(password, req.Password) {
		token, err := generateJWT(username)
		if err != nil {
			http.Error(w, "Token generation failed", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"token": token,
		})
	} else {
		http.Error(w, "Wrong password!", http.StatusUnauthorized)
		return
	}
}
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || len(authHeader) < 8 || authHeader[:7] != "Bearer " {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		tokenStr := authHeader[7:]
		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return jwt_key, nil
		})
		if err != nil || !token.Valid {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}
		username, ok := claims["username"].(string)
		if !ok {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), usernameKey, username)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func main() {
	godotenv.Load()

	jwt_key = []byte(os.Getenv("JWT"))
	var err error
	connStr := "user=postgres password=admin dbname=dbmagaztest sslmode=disable"
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Panic(err)
		log.Print("Something with db")
	}
	if err = db.Ping(); err != nil {
		log.Fatal("DB is unreachable ", err)
	}
	defer db.Close()
	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Group(func(r chi.Router) {
		r.Use(AuthMiddleware)
		r.Get("/profile", getProfile)
		r.Post("/products", postProducts)
		r.Put("/products/{id}", putProduct)
		r.Delete("/products/{id}", deleteProduct)
		r.Route("/cart", func(r chi.Router) {
			r.Get("/", getCart)
			r.Post("/add", addCart)
			r.Post("/remove", removefromCart)
			r.Delete("/clear", clearCart)
		})
		r.Route("/orders", func(r chi.Router) {
			r.Post("/", postOrders)
			r.Get("/", getOrders)
			r.Post("/update", updateStatus)
			r.Get("/{id}", getOrderbyID)
			r.Get("/getall", getAllOrders)
		})

	})

	r.Get("/products", getProducts)
	r.Get("/products/{id}", getProductByID)
	r.Post("/login", Login)
	r.Post("/registration", Registration)
	http.ListenAndServe(":8080", r)
}
