
if [ -d node_modules ]; then
    echo "project already init"
else
    echo "set up the project environment..."
    npm ci
    touch .env
    mkdir -p logs && touch logs/combined.log logs/error.log
    echo "set up done, don't forget to add env variables"
fi

echo "run pm2 start:prod"
npm run start:prod
