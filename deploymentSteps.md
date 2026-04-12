# 1. Rebuild the frontend
cd your-frontend-folder
VITE_API_URL="" npm run build

# 2. Replace wwwroot with the new build
rm -rf ../your-backend-folder/wwwroot/*
cp -r dist/* ../your-backend-folder/wwwroot/

# 3. Now publish and deploy the backend
cd ../your-backend-folder
dotnet publish -c Release -o publish