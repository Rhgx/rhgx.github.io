let servers = [];

document.addEventListener('DOMContentLoaded', function () {
    fetch('data/servers.json')
        .then(response => response.json())
        .then(data => {
            servers = data; 
            renderServers(servers);

            anime({
                targets: '#search-bar',
                opacity: [0, 1],
                translateY: [-20, 0],
                duration: 600,
                easing: 'easeOutExpo'
            });
        });
});

function renderServers(serversToRender) {
    serversToRender.sort((a, b) => a.title.localeCompare(b.title));

    const container = document.getElementById('server-container');
    container.innerHTML = '';
    serversToRender.forEach(server => {
        const serverCard = document.createElement('div');
        serverCard.classList.add('server-card');
        
        serverCard.innerHTML = `
            <img src="${server.logo}" alt="${server.title} logo">
            <div class="server-details">
                <h3>${server.title}</h3>
                <p>${server.description}</p>
                <div class="server-tags">${renderTags(server.tags)}</div>
            </div>
            <div class="copy-btn-container">
                <button class="copy-btn" onclick="copyToClipboard('${server.code}')">
                    ${server.code}
                    <span class="material-symbols-outlined">link</span>
                </button>
            </div>
        `;
        
        container.appendChild(serverCard);
    });

    anime({
        targets: '.server-card',
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 600,
        easing: 'easeOutExpo',
        delay: anime.stagger(50) 
    });
}

function renderTags(tags) {
    return tags.map(tag => `<span class="server-tag" style="background-color:${getTagColor(tag)};">${capitalizeTag(tag)}</span>`).join('');
}
function getTagColor(tag) {
    const colors = {
        'standart': '#c0392b',
        'vs-bosses': '#27ae60',
        'randomizer': '#f39c12',
        'class-wars': '#2980b9',
        'prop-hunt': '#e91e63',
        'highlander': '#f39c12',
        '6v6': '#0077b3',
        'team-deathmatch': '#8e44ad', 
        'capture-the-flag': '#e67e22',
        'player-destruction': '#f1c40f',
        '24/7': '#f39c12',            
        'custom-maps': '#3498db',     
        "trading" : "#db5027",
        "payload" : "#4b9922",
        "control-points" : "#15bd74",
        "koth" : "#3814b8"
    };
    return colors[tag.toLowerCase()] || '#555';
}


function capitalizeTag(tag) {
    if (tag === "24-7") return "24/7";
    if (tag === "koth") return "KOTH";
    return tag.replace(/-/g, ' ') 
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
}

const searchBar = document.getElementById('search-bar');
searchBar.addEventListener('input', function() {
    const query = searchBar.value.toLowerCase();
    filterServersBySearch(query);
});

function filterServersBySearch(query) {
    const filteredServers = servers.filter(server => {
        return server.title.toLowerCase().includes(query) || 
               server.description.toLowerCase().includes(query);
    });

    renderServers(filteredServers);
}


document.querySelectorAll('.filters input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        filterServersByCheckbox();
    });
});

function filterServersByCheckbox() {
    const selectedFilters = Array.from(document.querySelectorAll('.filters input[type="checkbox"]:checked')).map(checkbox => checkbox.id);
    
    const filteredServers = servers.filter(server => {
        return selectedFilters.every(filter => server.tags.includes(filter));
    });

    renderServers(filteredServers);
}

// Function to copy server code to clipboard
function copyToClipboard(text) {
    const tempInput = document.createElement('input');
    document.body.appendChild(tempInput);
    tempInput.value = text;
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    alert('Copied to clipboard: ' + text);
}
