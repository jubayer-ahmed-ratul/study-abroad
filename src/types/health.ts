export interface HealthSuccess {
  status: "ok";
  service: "database" | "cloudinary";
  message: string;
}

export interface HealthError {
  status: "error" | "misconfigured";
  service: "database" | "cloudinary";
  message: string;
}
