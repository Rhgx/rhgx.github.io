document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const placeId = '126884695634066'; 
    let isFirstLoad = true;

    // --- UTILITY FUNCTIONS ---
    async function fetchJson(url) {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`);
        }
        const responseText = await response.text();
        return JSON.parse(responseText);
    }
    
    const numberFormatter = new Intl.NumberFormat('de-DE');

    function parseFormattedNumber(str) {
        return parseInt(str.replace(/\./g, ''), 10) || 0;
    }

    function animateValue(element, end) {
        const start = parseFormattedNumber(element.textContent);
        if (typeof end !== 'number' || start === end) return;

        const obj = { val: start };
        gsap.to(obj, {
            val: end,
            duration: 1.5,
            ease: "power1.out",
            onUpdate: () => {
                element.textContent = numberFormatter.format(Math.round(obj.val));
            }
        });
    }

    // --- MAIN DATA REFRESH LOGIC ---
    async function updateGameData() {
        if (!isFirstLoad) {
            console.log("Refreshing game data (30s interval)...");
        }
        try {
            const universeApiUrl = `https://apis.roblox.com/universes/v1/places/${placeId}/universe`;
            const universeData = await fetchJson(universeApiUrl);
            const universeId = universeData.universeId;

            if (!universeId) throw new Error("Could not derive Universe ID.");

            const gamesApiUrl = `https://games.roblox.com/v1/games?universeIds=${universeId}`;
            const votesApiUrl = `https://games.roblox.com/v1/games/votes?universeIds=${universeId}`;
            const favoritesApiUrl = `https://games.roblox.com/v1/games/${universeId}/favorites/count`;
            
            const [gamesResult, votesResult, favoritesResult] = await Promise.all([
                fetchJson(gamesApiUrl), fetchJson(votesApiUrl), fetchJson(favoritesApiUrl)
            ]);

            const gamesData = gamesResult.data[0];
            const votesData = votesResult.data[0];
            const favoritesData = favoritesResult;
            
            if (isFirstLoad) {
                const thumbnailApiUrl = `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=1&defaults=true&size=768x432&format=Png&isCircular=false`;
                const thumbnailResult = await fetchJson(thumbnailApiUrl);
                const thumbnailData = thumbnailResult.data[0];
                const thumbnailUrl = thumbnailData?.thumbnails[0]?.imageUrl;
                if (thumbnailUrl) document.body.style.backgroundImage = `url(${thumbnailUrl})`;
                
                const gameNameElement = document.getElementById('game-name');
                gameNameElement.textContent = gamesData.name || 'Game Title';
                twemoji.parse(gameNameElement);
            }

            animateValue(document.getElementById('playing'), gamesData.playing);
            animateValue(document.getElementById('favorites'), favoritesData.favoritesCount);
            animateValue(document.getElementById('likes'), votesData.upVotes);
            animateValue(document.getElementById('dislikes'), votesData.downVotes);

            const totalVotes = votesData.upVotes + votesData.downVotes;
            const likePercentage = totalVotes > 0 ? (votesData.upVotes / totalVotes) * 100 : 0;
            const dislikePercentage = totalVotes > 0 ? (votesData.downVotes / totalVotes) * 100 : 0;
            
            document.getElementById('like-ratio-value').textContent = `${Math.round(likePercentage)}%`;
            
            if (isFirstLoad) {
                document.getElementById('like-bar').style.width = `${likePercentage}%`;
                document.getElementById('dislike-bar').style.width = `${dislikePercentage}%`;
                isFirstLoad = false;
            } else {
                gsap.to("#like-bar", { width: `${likePercentage}%`, duration: 1.5, ease: "power1.out" });
                gsap.to("#dislike-bar", { width: `${dislikePercentage}%`, duration: 1.5, ease: "power1.out" });
            }

        } catch (error) {
            console.error("Failed to fetch game data:", error);
            document.getElementById('game-name').textContent = "Error: Could not load data.";
        }
    }

    // --- COUNTDOWN TIMER ---
    function updateCountdown() {
        const now = new Date();
        const nextUpdate = new Date();
        nextUpdate.setUTCHours(14, 0, 0, 0);
        let daysUntilSaturday = 6 - now.getUTCDay();
        if (now.getUTCDay() > 6 || (now.getUTCDay() === 6 && now.getUTCHours() >= 14)) {
            daysUntilSaturday += 7;
        }
        nextUpdate.setUTCDate(now.getUTCDate() + daysUntilSaturday);
        const diff = nextUpdate.getTime() - now.getTime();
        document.getElementById('days').textContent = Math.floor(diff / (1000 * 60 * 60 * 24));
        document.getElementById('hours').textContent = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        document.getElementById('minutes').textContent = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        document.getElementById('seconds').textContent = Math.floor((diff % (1000 * 60)) / 1000);
    }

    // --- INITIALIZE ---
    updateCountdown();
    setInterval(updateCountdown, 1000);

    updateGameData();
    setInterval(updateGameData, 30000); 
});